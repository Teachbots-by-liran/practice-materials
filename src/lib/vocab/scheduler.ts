// Decides which words a student practises today and how each answer moves a word along.
//
// Spacing: each word has an interval (days until it comes back) that grows with
// correct answers — more for answers that are hard to guess (typed recall) than
// for easy ones (swipe). A wrong answer brings the word back tomorrow.
// Mastery (successive relearning): 3 unaided correct recalls on different days,
// at least one of them produced (typed or tiles), in at least 2 different contexts.

import { addDays, daysBetween, daysLeftInWeek, weekStart } from "./dates";
import type {
  Pace,
  Question,
  QuestionType,
  StudentProgress,
  WordEntry,
  WordList,
  WordState,
} from "./types";

export type Rng = () => number;

export const MAX_REVIEWS = 12;
const MAX_NEW: Record<Pace, number> = { steady: 3, normal: 5, boost: 8 };
const MAX_INTERVAL = 180;
const LOW_ACCURACY = 0.75;

export type AnswerFormat = QuestionType | "typed" | "tiles";

/** How much a correct answer proves: guessable formats move a word along less. */
export const FORMAT_WEIGHT: Record<AnswerFormat, number> = {
  swipe: 0.4,
  meaning: 0.6,
  cloze: 0.7,
  pick: 0.8,
  tiles: 0.9,
  typed: 1,
  chat: 0.9,
  family: 0.9,
};

export interface Outcome {
  questionId: string;
  correct: boolean;
  hinted: boolean;
  tooFast: boolean;
  /** The student produced the word (typed or letter tiles). */
  production: boolean;
  weight: number;
}

export function newWordState(word: string, listId: string, today: string, known = false): WordState {
  return {
    word,
    listId,
    stage: known ? "review" : "learning",
    known,
    interval: 0,
    ease: known ? 2.6 : 2.3,
    due: today,
    introduced: today,
    lastReview: null,
    lastCorrect: null,
    reps: 0,
    lapses: 0,
    hints: 0,
    correctDays: [],
    correctContexts: [],
    produced: false,
    seen: {},
  };
}

function withStage(s: WordState): WordState {
  if (s.correctDays.length >= 3 && s.produced && s.correctContexts.length >= 2) return { ...s, stage: "mastered" };
  if (s.reps >= 2 || s.known) return { ...s, stage: "review" };
  return { ...s, stage: "learning" };
}

export function applyAnswer(s: WordState, o: Outcome, today: string): WordState {
  const next: WordState = {
    ...s,
    seen: { ...s.seen, [o.questionId]: today },
    correctDays: [...s.correctDays],
    correctContexts: [...s.correctContexts],
    lastReview: today,
  };
  const ok = o.correct && !o.tooFast;
  next.lastCorrect = ok;

  if (!ok) {
    next.lapses++;
    next.ease = Math.max(1.3, s.ease - 0.2);
    next.interval = 1;
    next.due = addDays(today, 1);
    next.stage = "learning";
    return next;
  }

  if (o.hinted) {
    next.hints++;
    next.ease = Math.max(1.3, s.ease - 0.05);
    next.interval = Math.max(1, s.interval * 1.2);
    next.due = addDays(today, Math.round(next.interval));
    return withStage(next);
  }

  if (!next.correctContexts.includes(o.questionId)) next.correctContexts.push(o.questionId);
  if (o.production) next.produced = true;

  // A second correct answer on the same day (e.g. an in-session retry) doesn't
  // stretch the interval: spacing only counts across days.
  if (s.lastReview === today) {
    if (next.interval < 1) {
      next.interval = 1;
      next.due = addDays(today, 1);
    }
    return withStage(next);
  }

  if (o.weight >= 0.7 && !next.correctDays.includes(today)) next.correctDays.push(today);
  next.reps++;

  let interval: number;
  if (s.reps === 0) interval = 1 + ((s.known ? 4 : 1) - 1) * o.weight;
  else if (s.reps === 1) interval = 1 + ((s.known ? 8 : 3) - 1) * o.weight;
  else {
    // Recalling a word after a long gap is stronger evidence than recalling it on time.
    const elapsed = s.lastReview ? daysBetween(s.lastReview, today) : s.interval;
    interval = Math.max(s.interval, elapsed) * (1 + (s.ease - 1) * o.weight);
  }
  next.interval = Math.min(MAX_INTERVAL, Math.max(1, interval));
  if (o.weight >= 0.9) next.ease = Math.min(2.8, s.ease + 0.05);
  next.due = addDays(today, Math.round(next.interval));
  return withStage(next);
}

// ── Choosing questions ─────────────────────────────────────────────

export type Purpose = "recognize" | "produce" | "review" | "boss";

const RECOGNIZE: QuestionType[] = ["meaning", "cloze", "swipe"];
const PRODUCE: QuestionType[] = ["chat", "family"];

function typesFor(purpose: Purpose, s: WordState | undefined): QuestionType[] {
  if (purpose === "recognize") return RECOGNIZE;
  if (purpose === "produce") return PRODUCE;
  if (purpose === "boss") return ["cloze"];
  if (!s || s.stage === "learning") return s && s.reps > 0 ? [...RECOGNIZE, ...PRODUCE] : RECOGNIZE;
  return ["chat", "family", "pick", "cloze", "swipe"];
}

export function pickQuestion(
  entry: WordEntry,
  s: WordState | undefined,
  purpose: Purpose,
  rng: Rng,
  exclude: Set<string> = new Set(),
): Question | undefined {
  const types = typesFor(purpose, s);
  // Known words skip the easy versions: advanced questions first, then production.
  const wantAdvanced = !!s?.known && s.stage !== "mastered" && purpose !== "boss";
  let pool = entry.questions.filter((q) => types.includes(q.type) && (wantAdvanced || q.level !== "advanced"));
  if (wantAdvanced) {
    const adv = entry.questions.filter((q) => q.level === "advanced");
    if (adv.some((q) => !exclude.has(q.id))) pool = adv;
  }
  if (purpose === "boss" && pool.length === 0) pool = entry.questions.filter((q) => q.type === "meaning");
  const fresh = pool.filter((q) => !exclude.has(q.id));
  const candidates = fresh.length ? fresh : pool;
  if (!candidates.length) return undefined;

  // Least recently seen first, so the student meets the word in new contexts.
  const seenOn = (q: Question) => s?.seen[q.id] ?? "";
  return [...candidates]
    .map((q) => ({ q, key: seenOn(q), r: rng() }))
    .sort((a, b) => (a.key === b.key ? a.r - b.r : a.key < b.key ? -1 : 1))[0].q;
}

// ── Building a session ─────────────────────────────────────────────

export type SessionItem =
  | { kind: "meet"; word: string }
  | { kind: "q"; word: string; qid: string; mode?: "typed" | "tiles"; retry?: boolean }
  | { kind: "bank"; items: { word: string; qid: string }[]; distractors: string[] }
  | { kind: "write"; word: string }
  | { kind: "boss"; items: { word: string; qid: string }[] };

export type BudgetReason = "normal" | "catch-up" | "struggling" | "goal-met" | "list-done" | "extra";

export interface SessionPlan {
  items: SessionItem[];
  newWords: string[];
  reviewWords: string[];
  reason: BudgetReason;
}

export function listStates(p: StudentProgress, listId: string): WordState[] {
  return Object.values(p.words).filter((s) => s.listId === listId);
}

export function recentAccuracy(p: StudentProgress, n = 30): number | null {
  const recent = p.answers.slice(-n);
  if (recent.length < 10) return null;
  return recent.filter((a) => a.correct && !a.tooFast).length / recent.length;
}

export function newThisWeek(p: StudentProgress, listId: string, today: string): number {
  const start = weekStart(today);
  return listStates(p, listId).filter((s) => !s.known && s.introduced >= start).length;
}

function reviewPriority(s: WordState, today: string): number {
  const interval = Math.max(1, s.interval);
  const urgency = (daysBetween(s.due, today) + interval) / interval;
  return (s.lastCorrect === false ? 100 : 0) + urgency * 10 + s.lapses;
}

export function dueWords(p: StudentProgress, listId: string, today: string): WordState[] {
  return listStates(p, listId)
    .filter((s) => s.due <= today)
    .sort((a, b) => reviewPriority(b, today) - reviewPriority(a, today));
}

export function newWordBudget(
  p: StudentProgress,
  list: WordList,
  today: string,
  extra = 0,
): { count: number; reason: BudgetReason } {
  const unseen = list.words.filter((w) => !p.words[w.word]).length;
  if (unseen === 0) return { count: 0, reason: "list-done" };
  if (extra > 0) return { count: Math.min(extra, unseen), reason: "extra" };
  if (dueWords(p, list.id, today).length > MAX_REVIEWS) return { count: 0, reason: "catch-up" };

  const remaining = p.weeklyGoal - newThisWeek(p, list.id, today);
  if (remaining <= 0) return { count: 0, reason: "goal-met" };
  let count = Math.min(MAX_NEW[p.pace], Math.ceil(remaining / daysLeftInWeek(today)), unseen);
  const acc = recentAccuracy(p);
  if (acc !== null && acc < LOW_ACCURACY) return { count: Math.min(count, 1), reason: "struggling" };
  count = Math.max(count, 0);
  return { count, reason: "normal" };
}

function confusedWith(a: WordEntry, b: WordEntry): boolean {
  return !!a.confusables?.includes(b.word) || !!b.confusables?.includes(a.word);
}

/** Next words in list order, keeping easily-confused words days apart. */
export function pickNewWords(p: StudentProgress, list: WordList, count: number, today: string): WordEntry[] {
  const recent = list.words.filter((w) => {
    const s = p.words[w.word];
    return s && !s.known && daysBetween(s.introduced, today) <= 2;
  });
  const picked: WordEntry[] = [];
  for (const w of list.words) {
    if (picked.length >= count) break;
    if (p.words[w.word]) continue;
    if ([...recent, ...picked].some((o) => confusedWith(w, o))) continue;
    picked.push(w);
  }
  return picked;
}

export function buildSession(
  list: WordList,
  p: StudentProgress,
  today: string,
  rng: Rng,
  opts: { extraNew?: number } = {},
): SessionPlan {
  const entries = new Map(list.words.map((w) => [w.word, w]));
  const reviews = dueWords(p, list.id, today).slice(0, MAX_REVIEWS);
  const budget = newWordBudget(p, list, today, opts.extraNew);
  const fresh = pickNewWords(p, list, budget.count, today);
  const used = new Set<string>();
  const items: SessionItem[] = [];
  let typed = 0;

  const ask = (word: string, purpose: Purpose, mode?: "typed" | "tiles") => {
    const entry = entries.get(word);
    if (!entry) return;
    const s = p.words[word];
    const q = pickQuestion(entry, s, purpose, rng, used);
    if (!q) return;
    used.add(q.id);
    const item: SessionItem = { kind: "q", word, qid: q.id };
    if (q.type === "chat" || q.type === "family") {
      // Typing is the strongest practice but tiring on a phone: about 1 in 5 questions,
      // and only for words the student is past the first stage on.
      const strongEnough = !!s && (s.stage !== "learning" || s.known);
      const budgetLeft = typed < Math.ceil((reviews.length + fresh.length * 3) / 5);
      item.mode = mode ?? (strongEnough && budgetLeft ? "typed" : "tiles");
      if (item.mode === "typed") typed++;
    }
    items.push(item);
  };

  const queue = [...reviews];
  for (const w of fresh) {
    items.push({ kind: "meet", word: w.word });
    const r = queue.shift();
    if (r) ask(r.word, "review");
    ask(w.word, "recognize");
  }
  for (const r of queue) ask(r.word, "review");
  for (const w of fresh) ask(w.word, "produce", "tiles");

  // Word bank: three gaps from this session's words, plus two decoys.
  const sessionWords = [...reviews.map((r) => r.word), ...fresh.map((w) => w.word)];
  const bankPool = sessionWords
    .map((word) => {
      const q = entries.get(word)?.questions.find((x) => x.type === "chat" && !used.has(x.id));
      return q ? { word, qid: q.id } : null;
    })
    .filter((x): x is { word: string; qid: string } => !!x);
  if (items.length >= 6 && bankPool.length >= 3) {
    const chosen = shuffle(bankPool, rng).slice(0, 3);
    chosen.forEach((c) => used.add(c.qid));
    const decoys = shuffle(
      list.words.map((w) => w.word).filter((w) => !chosen.some((c) => c.word === w)),
      rng,
    ).slice(0, 2);
    items.push({ kind: "bank", items: chosen, distractors: decoys });
  }

  // One optional "write your own sentence" for a word the student is getting comfortable with.
  const writeWord = reviews.find(
    (r) => r.stage !== "learning" && !p.sentences.some((s) => s.word === r.word && s.listId === list.id),
  );
  if (writeWord) items.push({ kind: "write", word: writeWord.word });

  const boss = bossItems(list, p, sessionWords, rng);
  if (boss.length >= 3) items.push({ kind: "boss", items: boss });

  return { items, newWords: fresh.map((w) => w.word), reviewWords: reviews.map((r) => r.word), reason: budget.reason };
}

/** The student's trickiest words: most misses overall, topped up with today's words. */
export function bossItems(list: WordList, p: StudentProgress, sessionWords: string[], rng: Rng) {
  const entries = new Map(list.words.map((w) => [w.word, w]));
  const tricky = listStates(p, list.id)
    .filter((s) => s.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses)
    .map((s) => s.word);
  const words = [...new Set([...tricky, ...shuffle(sessionWords, rng)])];
  const out: { word: string; qid: string }[] = [];
  for (const word of words) {
    if (out.length >= 4) break;
    const entry = entries.get(word);
    const q = entry && pickQuestion(entry, p.words[word], "boss", rng);
    if (q) out.push({ word, qid: q.id });
  }
  return out;
}

/** A different question for a word the student just missed, a few items later. */
export function retryItem(entry: WordEntry, s: WordState | undefined, used: Set<string>, rng: Rng): SessionItem | null {
  const purpose: Purpose = s && s.reps > 0 ? "review" : "recognize";
  const q = pickQuestion(entry, s, purpose, rng, used);
  if (!q) return null;
  used.add(q.id);
  const mode = q.type === "chat" || q.type === "family" ? "tiles" : undefined;
  return { kind: "q", word: entry.word, qid: q.id, mode, retry: true };
}

// ── Placement ──────────────────────────────────────────────────────

export function placementItems(list: WordList, rng: Rng, max = 20): { word: string; qid: string }[] {
  return shuffle(list.words, rng)
    .slice(0, max)
    .map((w) => {
      const q = w.questions.find((x) => x.type === "cloze" && x.level !== "advanced") ?? w.questions.find((x) => x.type === "meaning");
      return q ? { word: w.word, qid: q.id } : null;
    })
    .filter((x): x is { word: string; qid: string } => !!x);
}

/** Words answered correctly (and not too fast) are marked known and spread over the next days. */
export function applyPlacement(p: StudentProgress, list: WordList, knownWords: string[], today: string): StudentProgress {
  const words = { ...p.words };
  knownWords.forEach((word, i) => {
    const s = newWordState(word, list.id, today, true);
    s.due = addDays(today, i % 5);
    words[word] = s;
  });
  return { ...p, words, placementDone: true };
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
