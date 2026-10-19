import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  applyAnswer,
  buildSession,
  FORMAT_WEIGHT,
  newWordBudget,
  newWordState,
  pickNewWords,
  seededRng,
  type Outcome,
} from "./scheduler";
import type { StudentProgress, WordEntry, WordList } from "./types";

const TODAY = "2026-10-18"; // a Sunday

function entry(word: string, extra: Partial<WordEntry> = {}): WordEntry {
  const q = (n: number) => `${word}-${n}`;
  return {
    word,
    pos: "verb",
    he: "מילה",
    definition: `meaning of ${word}`,
    family: [],
    meet: { sentence: `They {${word}} it.`, options: ["a", "b", "c"], answer: 0 },
    questions: [
      { id: q(1), type: "meaning", prompt: "…", options: [word, "x", "y", "z"], answer: 0 },
      { id: q(2), type: "cloze", sentence: "We {_} it.", options: [word, "x", "y", "z"], answer: 0 },
      { id: q(3), type: "swipe", sentence: `We {${word}} it.`, correct: true, explain: "" },
      { id: q(4), type: "chat", who: "Dan", them: "?", me: "We {_} it.", answer: word },
      { id: q(5), type: "chat", who: "Dan", them: "?", me: "They {_} it.", answer: word },
    ],
    ...extra,
  };
}

const LIST: WordList = {
  id: "test",
  title: "Test",
  words: [entry("adapt", { confusables: ["adopt"] }), entry("adopt"), entry("achieve"), entry("reveal"), entry("reject"), entry("sustain")],
};

function progress(extra: Partial<StudentProgress> = {}): StudentProgress {
  return {
    version: 1,
    name: "Test",
    listId: "test",
    placementDone: true,
    weeklyGoal: 15,
    pace: "normal",
    xp: 0,
    activeDays: [],
    words: {},
    answers: [],
    sentences: [],
    settings: { sound: true },
    ...extra,
  };
}

const ok = (qid: string, format: keyof typeof FORMAT_WEIGHT, extra: Partial<Outcome> = {}): Outcome => ({
  questionId: qid,
  correct: true,
  hinted: false,
  tooFast: false,
  production: format === "typed" || format === "tiles",
  weight: FORMAT_WEIGHT[format],
  ...extra,
});

describe("applyAnswer", () => {
  it("grows the interval with correct answers across days", () => {
    let s = newWordState("achieve", "test", TODAY);
    s = applyAnswer(s, ok("achieve-4", "typed"), TODAY);
    expect(s.interval).toBe(1);
    s = applyAnswer(s, ok("achieve-5", "typed"), s.due);
    expect(s.interval).toBe(3);
    const before = s.interval;
    s = applyAnswer(s, ok("achieve-4", "typed"), s.due);
    expect(s.interval).toBeGreaterThan(before * 2);
  });

  it("moves a word less for guessable formats", () => {
    const base = applyAnswer(applyAnswer(newWordState("a", "t", TODAY), ok("q1", "typed"), TODAY), ok("q2", "typed"), addDays(TODAY, 1));
    const day = addDays(base.due, 0);
    const typed = applyAnswer(base, ok("q3", "typed"), day);
    const swipe = applyAnswer(base, ok("q3", "swipe"), day);
    expect(swipe.interval).toBeLessThan(typed.interval);
  });

  it("does not stretch the interval for a second correct answer on the same day", () => {
    let s = applyAnswer(newWordState("a", "t", TODAY), ok("q1", "typed"), TODAY);
    const interval = s.interval;
    s = applyAnswer(s, ok("q2", "typed"), TODAY);
    expect(s.interval).toBe(interval);
    expect(s.correctDays).toEqual([TODAY]);
  });

  it("brings a missed word back tomorrow and lowers its ease", () => {
    const s = applyAnswer(newWordState("a", "t", TODAY), { ...ok("q1", "cloze"), correct: false }, TODAY);
    expect(s.due).toBe(addDays(TODAY, 1));
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(2.3);
  });

  it("treats a too-fast answer as not counted", () => {
    const s = applyAnswer(newWordState("a", "t", TODAY), ok("q1", "cloze", { tooFast: true }), TODAY);
    expect(s.lastCorrect).toBe(false);
    expect(s.correctDays).toHaveLength(0);
  });

  it("masters a word after 3 days, a production and 2 contexts", () => {
    let s = newWordState("a", "t", TODAY);
    let day = TODAY;
    const qs = ["q1", "q2", "q1"];
    for (const q of qs) {
      s = applyAnswer(s, ok(q, "typed"), day);
      day = s.due;
    }
    expect(s.stage).toBe("mastered");
  });

  it("does not master on recognition alone", () => {
    let s = newWordState("a", "t", TODAY);
    let day = TODAY;
    for (const q of ["q1", "q2", "q3", "q4"]) {
      s = applyAnswer(s, ok(q, "cloze"), day);
      day = s.due;
    }
    expect(s.produced).toBe(false);
    expect(s.stage).not.toBe("mastered");
  });

  it("counts a hinted answer but brings the word back sooner", () => {
    const base = applyAnswer(newWordState("a", "t", TODAY), ok("q1", "typed"), TODAY);
    const day = base.due;
    const hinted = applyAnswer(base, ok("q2", "typed", { hinted: true }), day);
    const clean = applyAnswer(base, ok("q2", "typed"), day);
    expect(hinted.interval).toBeLessThan(clean.interval);
    expect(hinted.hints).toBe(1);
  });
});

describe("new word budget", () => {
  it("spreads the weekly goal over the days left", () => {
    // Sunday, 15 words left, 7 days → 3 today
    expect(newWordBudget(progress(), LIST, TODAY).count).toBe(3);
  });

  it("stops new words on a catch-up day", () => {
    const words = Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`w${i}`, { ...newWordState(`w${i}`, "test", "2026-10-01"), due: "2026-10-10" }]),
    );
    expect(newWordBudget(progress({ words }), LIST, TODAY).reason).toBe("catch-up");
  });

  it("slows down when accuracy drops", () => {
    const answers = Array.from({ length: 20 }, (_, i) => ({
      date: TODAY, word: "a", questionId: "q", correct: i % 2 === 0, hinted: false, tooFast: false, ms: 3000,
    }));
    const b = newWordBudget(progress({ answers }), LIST, TODAY);
    expect(b).toEqual({ count: 1, reason: "struggling" });
  });

  it("keeps easily confused words apart", () => {
    const picked = pickNewWords(progress(), LIST, 3, TODAY).map((w) => w.word);
    expect(picked).toContain("adapt");
    expect(picked).not.toContain("adopt");
  });
});

describe("buildSession", () => {
  it("introduces new words with a meet card, a check and a production", () => {
    const plan = buildSession(LIST, progress(), TODAY, seededRng(1));
    expect(plan.newWords).toHaveLength(3);
    for (const w of plan.newWords) {
      const kinds = plan.items.filter((i) => "word" in i && i.word === w).map((i) => i.kind);
      expect(kinds[0]).toBe("meet");
      expect(kinds.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("puts due reviews in the session and adds a boss round", () => {
    const words = Object.fromEntries(
      ["achieve", "reveal", "reject"].map((w) => [w, { ...newWordState(w, "test", "2026-10-10"), reps: 2, stage: "review" as const, interval: 3, due: "2026-10-17", lapses: 1 }]),
    );
    const plan = buildSession(LIST, progress({ words }), TODAY, seededRng(2));
    expect(plan.reviewWords.sort()).toEqual(["achieve", "reject", "reveal"]);
    expect(plan.items.some((i) => i.kind === "boss")).toBe(true);
  });
});
