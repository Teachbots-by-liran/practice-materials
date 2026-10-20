// Checks a generated word list before it reaches students. Catches the mistakes
// generation tends to make: gaps that don't exist, answers that aren't a form of
// the word, too few contexts, repeated sentences, missing Hebrew.

import type { Question, WordEntry, WordList } from "./types";

const GAP = /\{_\}/g;
const MARK = /\{(?!_\})[^{}]+\}/g;
const HEBREW = /[֐-׿]/;

export interface Problem {
  word: string;
  id?: string;
  message: string;
}

function count(re: RegExp, s: string): number {
  return (s.match(re) ?? []).length;
}

/** Forms we accept as "the target word": the word itself, its family, and regular inflections. */
export function formsOf(entry: WordEntry): string[] {
  const bases = [entry.word, ...entry.family.map((f) => f.form)];
  const out = new Set<string>();
  for (const b of bases) {
    const stem = b.replace(/e$/, "");
    const yStem = b.replace(/y$/, "i");
    // Doubled final consonant: admit → admitted, stop → stopping.
    const doubled = /[^aeiou][aeiou][bdgklmnprt]$/.test(b) ? b + b.slice(-1) : null;
    [b, `${b}s`, `${b}es`, `${b}d`, `${b}ed`, `${stem}ed`, `${stem}ing`, `${b}ing`, `${yStem}es`, `${yStem}ed`, ...(doubled ? [`${doubled}ed`, `${doubled}ing`] : [])].forEach((f) =>
      out.add(f.toLowerCase()),
    );
  }
  return [...out];
}

function isForm(entry: WordEntry, s: string): boolean {
  return formsOf(entry).includes(s.trim().toLowerCase());
}

function checkOptions(problems: Problem[], entry: WordEntry, q: Question & { options: string[]; answer: number }) {
  const at = (message: string) => problems.push({ word: entry.word, id: q.id, message });
  if (q.options.length < 3 || q.options.length > 4) at("needs 3–4 options");
  if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) at("has duplicate options");
  if (q.answer < 0 || q.answer >= q.options.length) at("answer index is out of range");
}

function checkQuestion(problems: Problem[], entry: WordEntry, q: Question) {
  const at = (message: string) => problems.push({ word: entry.word, id: q.id, message });
  switch (q.type) {
    case "meaning":
      checkOptions(problems, entry, q);
      if (!q.prompt.trim()) at("prompt is empty");
      if (q.options[q.answer] && !isForm(entry, q.options[q.answer])) at(`correct option "${q.options[q.answer]}" is not a form of the word`);
      break;
    case "cloze":
      checkOptions(problems, entry, q);
      if (count(GAP, q.sentence) !== 1) at("sentence needs exactly one {_} gap");
      if (q.options[q.answer] && !isForm(entry, q.options[q.answer]) && q.level !== "advanced") {
        at(`correct option "${q.options[q.answer]}" is not a form of the word`);
      }
      break;
    case "swipe":
      if (count(MARK, q.sentence) !== 1) at("sentence needs exactly one {marked} word");
      if (!q.explain.trim()) at("needs an explanation");
      break;
    case "chat":
      if (count(GAP, q.me) !== 1) at("reply needs exactly one {_} gap");
      if (!q.them.trim() || !q.who.trim()) at("needs a friend's name and message");
      if (!isForm(entry, q.answer)) at(`answer "${q.answer}" is not a form of the word`);
      if (/\s/.test(q.answer.trim())) at("answer must be a single word");
      break;
    case "family":
      if (count(GAP, q.sentence) !== 1) at("sentence needs exactly one {_} gap");
      if (!isForm(entry, q.answer)) at(`answer "${q.answer}" is not in the word family`);
      if (!q.hint.trim()) at("needs a hint");
      break;
    case "pick": {
      const right = q.options.filter((o) => o.correct).length;
      if (q.options.length < 4 || q.options.length > 5) at("needs 4–5 sentences");
      if (right < 2 || right === q.options.length) at("needs at least 2 correct and 1 wrong sentence");
      if (q.options.some((o) => count(MARK, o.text) !== 1)) at("every sentence needs exactly one {marked} word");
      if (!q.explain.trim()) at("needs an explanation");
      break;
    }
  }
}

function sentencesOf(q: Question): string[] {
  switch (q.type) {
    case "cloze":
    case "swipe":
    case "family":
      return [q.sentence];
    case "chat":
      return [q.me];
    case "pick":
      return q.options.map((o) => o.text);
    default:
      return [];
  }
}

export function validateList(list: WordList): Problem[] {
  const problems: Problem[] = [];
  const ids = new Set<string>();
  const sentences = new Map<string, string>();
  const words = new Set<string>();

  if (!/^[a-z0-9-]+$/.test(list.id)) problems.push({ word: "-", message: "list id must be lowercase letters, digits and dashes" });

  for (const entry of list.words) {
    const at = (message: string, id?: string) => problems.push({ word: entry.word, id, message });
    if (words.has(entry.word)) at("word appears twice in the list");
    words.add(entry.word);

    if (!HEBREW.test(entry.he)) at("Hebrew translation is missing");
    if (!entry.definition.trim()) at("definition is missing");
    if (count(MARK, entry.meet.sentence) !== 1) at("meet sentence needs exactly one {marked} word");
    if (entry.meet.options.length !== 3) at("meet card needs 3 guess options");
    if (entry.meet.answer < 0 || entry.meet.answer > 2) at("meet answer index is out of range");

    for (const q of entry.questions) {
      if (ids.has(q.id)) at("duplicate question id", q.id);
      ids.add(q.id);
      if (!q.id.startsWith(`${entry.word}-`)) at(`question id should start with "${entry.word}-"`, q.id);
      checkQuestion(problems, entry, q);
      for (const s of sentencesOf(q)) {
        const key = s.toLowerCase().replace(/\{[^}]*\}/g, "_").replace(/\W+/g, " ").trim();
        const other = sentences.get(key);
        if (other) at(`repeats a sentence already used in ${other}`, q.id);
        else sentences.set(key, q.id);
      }
    }

    const has = (t: Question["type"]) => entry.questions.filter((q) => q.type === t && q.level !== "advanced").length;
    const core = entry.questions.filter((q) => q.level !== "advanced").length;
    const senses = entry.senses ?? [];
    const minCore = senses.length >= 2 ? 8 : 5;
    if (core < minCore) at(`needs at least ${minCore} core questions (has ${core})`);
    if (has("meaning") + has("cloze") < 1) at("needs a recognition question (meaning or cloze)");
    if (!entry.questions.some((q) => q.type === "cloze" && q.level !== "advanced")) at("needs a cloze question (used in the boss round)");
    if (has("chat") < 2) at("needs at least 2 chat questions (typed recall in different contexts)");
    if (has("swipe") < 1) at("needs a swipe question");
    if (entry.family.length > 0 && has("family") < 1) at("has a word family but no family question");
    if (!entry.questions.some((q) => q.level === "advanced")) at("needs at least 1 advanced question (for students who already know it)");
    for (const sense of senses) {
      const n = entry.questions.filter((q) => q.sense === sense).length;
      if (n < 2) at(`meaning "${sense}" needs at least 2 questions (has ${n})`);
    }
    for (const q of entry.questions) {
      if (q.sense && !senses.includes(q.sense)) at(`uses unknown meaning "${q.sense}"`, q.id);
    }
  }
  return problems;
}
