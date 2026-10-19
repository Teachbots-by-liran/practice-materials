"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dayKey } from "@/lib/vocab/dates";
import { GuessMonitor } from "@/lib/vocab/guessing";
import { markActive } from "@/lib/vocab/progress";
import {
  applyAnswer,
  FORMAT_WEIGHT,
  newWordState,
  retryItem,
  type SessionItem,
  type SessionPlan,
} from "@/lib/vocab/scheduler";
import type { FlagReason, Question, StudentProgress, WordEntry, WordList } from "@/lib/vocab/types";
import type { AnswerResult } from "./answer";
import { Boss, type BossQ } from "./Boss";
import { buzz, confetti, playSound } from "./fx";
import { BankScreen, ChoiceScreen, MeetScreen, PickScreen, ProduceScreen, SwipeScreen, WriteScreen } from "./Questions";

export interface SessionSummary {
  xp: number;
  bestCombo: number;
  correct: number;
  total: number;
  newWords: string[];
  newlyMastered: string[];
  again: string[];
  bossWon: boolean | null;
  wroteSentence: boolean;
}

interface Props {
  list: WordList;
  progress: StudentProgress;
  plan: SessionPlan;
  onProgress: (p: StudentProgress) => void;
  onExit: () => void;
  onFinish: (s: SessionSummary) => void;
}

type Feedback =
  | { kind: "quick"; text: string }
  | { kind: "sheet"; tone: "ok" | "no"; title: string; lines: string[] };

const NICE = ["Nice!", "Spot on!", "You got it!", "Great recall!", "Yes!"];
const MAX_RETRIES_PER_WORD = 2;

export function Session({ list, progress, plan, onProgress, onExit, onFinish }: Props) {
  const today = useMemo(() => dayKey(), []);
  const entries = useMemo(() => new Map(list.words.map((w) => [w.word, w])), [list]);
  const questions = useMemo(() => {
    const m = new Map<string, { entry: WordEntry; q: Question }>();
    list.words.forEach((entry) => entry.questions.forEach((q) => m.set(q.id, { entry, q })));
    return m;
  }, [list]);
  const realWords = useMemo(
    () => [...new Set(list.words.flatMap((w) => [w.word, ...w.family.map((f) => f.form), ...(w.confusables ?? [])]))],
    [list],
  );
  const masteredBefore = useMemo(
    () => new Set(Object.values(progress.words).filter((s) => s.stage === "mastered").map((s) => s.word)),
    // Only the state at the start of the session matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [items, setItems] = useState<SessionItem[]>(plan.items);
  const [idx, setIdx] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [toast, setToast] = useState<{ text: string; warn: boolean; key: number } | null>(null);
  const [xpFloat, setXpFloat] = useState<{ n: number; key: number } | null>(null);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [dockEl, setDockEl] = useState<HTMLElement | null>(null);
  const [lockMs, setLockMs] = useState(0);

  const monitor = useRef(new GuessMonitor());
  const fx = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const stats = useRef({ xp: 0, best: 0, correct: 0, total: 0, again: new Set<string>(), bossWon: null as boolean | null, wrote: false });
  const used = useRef(new Set(plan.items.flatMap((i) => (i.kind === "q" ? [i.qid] : i.kind === "boss" || i.kind === "bank" ? i.items.map((x) => x.qid) : []))));
  const retries = useRef(new Map<string, number>());
  const comboRef = useRef(0);

  const sound = progress.settings.sound;
  const showToast = (text: string, warn = false) => setToast({ text, warn, key: Date.now() });
  const dock = (node: ReactNode) => (dockEl ? createPortal(node, dockEl) : null);

  const update = (p: StudentProgress) => {
    progressRef.current = p;
    onProgress(p);
  };

  const finish = () => {
    const p = markActive(progressRef.current, today);
    update(p);
    const s = stats.current;
    onFinish({
      xp: s.xp,
      bestCombo: s.best,
      correct: s.correct,
      total: s.total,
      newWords: plan.newWords,
      newlyMastered: Object.values(p.words)
        .filter((w) => w.stage === "mastered" && w.listId === list.id && !masteredBefore.has(w.word))
        .map((w) => w.word),
      again: [...s.again],
      bossWon: s.bossWon,
      wroteSentence: s.wrote,
    });
  };

  const advance = () => {
    setFeedback(null);
    setLockMs(monitor.current.currentLockMs);
    if (idx + 1 >= items.length) finish();
    else setIdx(idx + 1);
  };

  /** Records one answer: scheduling, XP, combo, guess check. Returns whether it counted. */
  const record = (word: string, qid: string, r: AnswerResult, inBoss = false): { ok: boolean; tooFast: boolean } => {
    // Only answers with measured reading text are checked for guessing. Typing,
    // tiles and the word bank can't be blind-tapped to a right answer.
    const timed = r.chars > 0 && r.format !== "typed" && r.format !== "tiles";
    const verdict = timed
      ? monitor.current.record({ ms: r.ms, chars: r.chars, correct: r.correct, choice: r.choice, inBoss })
      : { tooFast: false, message: null, lockMs: 0 };
    const ok = r.correct && !verdict.tooFast;

    const p = progressRef.current;
    const s = p.words[word] ?? newWordState(word, list.id, today);
    const next = applyAnswer(
      s,
      { questionId: qid, correct: r.correct, hinted: r.hinted, tooFast: verdict.tooFast, production: r.production, weight: FORMAT_WEIGHT[r.format] },
      today,
    );

    const st = stats.current;
    st.total++;
    let gain = 0;
    if (ok) {
      st.correct++;
      comboRef.current++;
      st.best = Math.max(st.best, comboRef.current);
      const mult = comboRef.current >= 5 ? 3 : comboRef.current >= 3 ? 2 : 1;
      gain = (r.hinted ? 5 : 10) * mult;
      st.xp += gain;
      setXpFloat({ n: gain, key: Date.now() });
      if (comboRef.current === 3 || comboRef.current === 5) {
        showToast(`Combo x${mult}!`);
        confetti(fx.current, 45);
      }
      playSound("good", sound);
      buzz(25);
    } else {
      comboRef.current = 0;
      st.again.add(word);
      playSound("bad", sound);
      buzz([50, 40, 50]);
    }
    if (r.hinted) st.again.add(word);
    setCombo(comboRef.current);
    if (verdict.message) showToast(verdict.message, true);

    update({
      ...p,
      xp: p.xp + gain,
      words: { ...p.words, [word]: next },
      answers: [
        ...p.answers,
        { date: today, word, questionId: qid, correct: r.correct, hinted: r.hinted, tooFast: verdict.tooFast, ms: Math.round(r.ms) },
      ],
    });
    return { ok, tooFast: verdict.tooFast };
  };

  const scheduleRetry = (word: string) => {
    const entry = entries.get(word);
    const n = retries.current.get(word) ?? 0;
    if (!entry || n >= MAX_RETRIES_PER_WORD) return;
    const item = retryItem(entry, progressRef.current.words[word], used.current, Math.random);
    if (!item) return;
    retries.current.set(word, n + 1);
    setItems((cur) => {
      const copy = [...cur];
      // A few items later, but before the boss round.
      const bossAt = copy.findIndex((i) => i.kind === "boss");
      const end = bossAt >= 0 ? bossAt : copy.length;
      copy.splice(Math.min(idx + 3, end), 0, item);
      return copy;
    });
  };

  const onQuestionAnswer = (word: string, qid: string) => (r: AnswerResult) => {
    const { ok, tooFast } = record(word, qid, r);
    if (!ok) scheduleRetry(word);
    if (ok && !r.typo && !r.hinted) {
      setFeedback({ kind: "quick", text: NICE[Math.floor(Math.random() * NICE.length)] });
      setTimeout(advance, 750);
      return;
    }
    const lines: string[] = [];
    if (tooFast) lines.push("That was too fast to have read it, so it doesn't count. This word is coming back.");
    if (!r.correct && r.correctText) lines.push(`Answer: ${r.correctText}`);
    if (r.explain) lines.push(r.explain);
    if (r.hinted && ok) lines.push("You used a hint, so this word will come back a little sooner.");
    if (!ok && !tooFast) lines.push("You'll see this word again in a few minutes.");
    setFeedback({
      kind: "sheet",
      tone: ok ? "ok" : "no",
      title: ok ? (r.hinted ? "Correct, with a hint" : "Correct!") : tooFast ? "Slow down" : "Not quite",
      lines,
    });
  };

  const flag = (reason: FlagReason) => {
    if (!flagging) return;
    const p = progressRef.current;
    update({ ...p, flags: [...p.flags, { listId: list.id, questionId: flagging, reason, date: today }] });
    setFlagging(null);
    showToast("Thanks! Your teacher will check it.");
    advance();
  };

  const item = items[idx];
  const head = (qid: string, retry?: boolean) => (label: string) => (
    <div className="wq-eyebrow-row">
      <div className="wq-eyebrow">
        {label}
        {retry ? " · another try" : ""}
      </div>
      <button className="wq-flag" onClick={() => setFlagging(qid)} aria-label="Report a problem with this question">
        🚩 Report
      </button>
    </div>
  );

  let screen: ReactNode = null;
  if (item?.kind === "meet") {
    const entry = entries.get(item.word)!;
    screen = (
      <MeetScreen
        entry={entry}
        dock={dock}
        onDone={() => {
          const p = progressRef.current;
          if (!p.words[item.word]) update({ ...p, words: { ...p.words, [item.word]: newWordState(item.word, list.id, today) } });
          advance();
        }}
      />
    );
  } else if (item?.kind === "q") {
    const found = questions.get(item.qid);
    if (found) {
      const { entry, q } = found;
      const common = { entry, lockMs, dock, head: head(q.id, item.retry), onAnswer: onQuestionAnswer(entry.word, q.id) };
      const s = progress.words[entry.word];
      if (q.type === "meaning" || q.type === "cloze") screen = <ChoiceScreen {...common} q={q} />;
      else if (q.type === "swipe") screen = <SwipeScreen {...common} q={q} />;
      else if (q.type === "pick") screen = <PickScreen {...common} q={q} />;
      else
        screen = (
          <ProduceScreen
            {...common}
            q={q}
            mode={item.mode ?? "tiles"}
            showCue={!s || (s.introduced === today && !s.known)}
            realWords={realWords}
          />
        );
    }
  } else if (item?.kind === "bank") {
    const lines = item.items
      .map(({ qid }) => questions.get(qid))
      .filter((x): x is { entry: WordEntry; q: Question } => !!x && x.q.type === "chat")
      .map(({ entry, q }) => ({ entry, q: q as Extract<Question, { type: "chat" }> }));
    screen = (
      <BankScreen
        lines={lines}
        distractors={item.distractors}
        dock={dock}
        onDone={(results, ms) => {
          results.forEach((res) =>
            record(res.word, res.qid, { correct: res.correct, hinted: false, ms: ms / results.length, chars: 0, format: "cloze", production: false }),
          );
          const wrong = results.filter((x) => !x.correct);
          if (!wrong.length) {
            setFeedback({ kind: "quick", text: `${results.length}/${results.length}!` });
            setTimeout(advance, 900);
          } else {
            wrong.forEach((w) => scheduleRetry(w.word));
            setFeedback({
              kind: "sheet",
              tone: "no",
              title: `${results.length - wrong.length} of ${results.length} right`,
              lines: lines
                .filter((l) => wrong.some((w) => w.qid === l.q.id))
                .map((l) => `“${l.q.answer}”: ${l.q.me.replace("{_}", "___")}`),
            });
          }
        }}
      />
    );
  } else if (item?.kind === "write") {
    const entry = entries.get(item.word)!;
    screen = (
      <WriteScreen
        entry={entry}
        dock={dock}
        onDone={(text) => {
          if (text) {
            const p = progressRef.current;
            stats.current.xp += 20;
            stats.current.wrote = true;
            update({ ...p, xp: p.xp + 20, sentences: [...p.sentences, { word: item.word, listId: list.id, text, date: today }] });
            showToast("+20 XP · Saved for your teacher");
            playSound("good", sound);
          }
          advance();
        }}
      />
    );
  } else if (item?.kind === "boss") {
    const bossItems = item.items
      .map(({ qid }) => questions.get(qid))
      .filter((x): x is { entry: WordEntry; q: Question } => !!x && (x.q.type === "cloze" || x.q.type === "meaning"))
      .map(({ entry, q }) => ({ entry, q }) as BossQ);
    screen = (
      <Boss
        items={bossItems}
        dock={dock}
        onAnswer={(b, r) => record(b.entry.word, b.q.id, r, true).ok}
        onFinish={(won) => {
          stats.current.bossWon = won;
          if (won) {
            stats.current.xp += 50;
            const p = progressRef.current;
            update({ ...p, xp: p.xp + 50 });
            playSound("win", sound);
            confetti(fx.current, 90);
            buzz([30, 40, 30, 40, 80]);
          }
          advance();
        }}
      />
    );
  }

  const mult = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;

  return (
    <div className="wq-app">
      <header className="wq-top">
        <button className="wq-icon-btn" onClick={() => setConfirmQuit(true)} aria-label="Leave practice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="wq-track" role="progressbar" aria-label="Session progress" aria-valuenow={idx} aria-valuemax={items.length}>
          <div className="wq-fill" style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
        <div className={`wq-combo ${combo >= 3 ? "hot" : ""} ${combo > 0 ? "pop" : ""}`} key={combo}>
          {combo >= 3 ? (
            <>
              🔥 {combo} <span className="mult">x{mult}</span>
            </>
          ) : (
            `${combo} in a row`
          )}
        </div>
      </header>

      <main className="wq-stage" key={idx}>
        {screen}
        {feedback?.kind === "quick" && <div className="wq-quick">{feedback.text}</div>}
      </main>
      <footer className="wq-dock" ref={setDockEl} />

      {feedback?.kind === "sheet" && (
        <div className={`wq-sheet ${feedback.tone}`} role="status" aria-live="polite">
          <h3>{feedback.title}</h3>
          {feedback.lines.map((l, i) => (
            <p key={i} style={{ whiteSpace: "pre-line" }}>
              {l}
            </p>
          ))}
          <button className="wq-btn wq-btn-primary" onClick={advance} autoFocus>
            Continue
          </button>
        </div>
      )}

      {flagging && (
        <div className="wq-sheet neutral" role="dialog" aria-label="Report a problem">
          <h3>What&apos;s wrong with this question?</h3>
          {(
            [
              ["wrong-answer", "The answer is wrong"],
              ["two-answers", "More than one answer fits"],
              ["translation", "The translation is wrong"],
              ["confusing", "It's confusing"],
            ] as [FlagReason, string][]
          ).map(([reason, label]) => (
            <button key={reason} className="wq-btn wq-btn-ghost" onClick={() => flag(reason)}>
              {label}
            </button>
          ))}
          <button className="wq-btn wq-btn-link" onClick={() => setFlagging(null)}>
            Cancel
          </button>
        </div>
      )}

      {confirmQuit && (
        <div className="wq-sheet neutral" role="dialog" aria-label="Leave practice">
          <h3>Leave practice?</h3>
          <p>Everything you answered so far is saved.</p>
          <div className="wq-row">
            <button className="wq-btn wq-btn-ghost" onClick={onExit}>
              Leave
            </button>
            <button className="wq-btn wq-btn-primary" onClick={() => setConfirmQuit(false)} autoFocus>
              Keep going
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div key={`toast-${toast.key}`} className={`wq-toast ${toast.warn ? "warn" : ""}`}>
          {toast.text}
        </div>
      )}
      {xpFloat && (
        <div key={`xp-${xpFloat.key}`} className="wq-xp">
          +{xpFloat.n} XP
        </div>
      )}
      <canvas ref={fx} className="wq-fx" />
    </div>
  );
}
