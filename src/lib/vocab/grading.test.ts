import { describe, expect, it } from "vitest";
import { gradeTyped } from "./grading";
import { GuessMonitor, minReadMs } from "./guessing";

describe("gradeTyped", () => {
  it("accepts exact answers regardless of case and spacing", () => {
    expect(gradeTyped("  Sustain ", "sustain")).toBe("correct");
  });

  it("treats small typos as a typo (counted correct)", () => {
    expect(gradeTyped("sustian", "sustain")).toBe("typo");
    expect(gradeTyped("sustan", "sustain")).toBe("typo");
    expect(gradeTyped("sustian", "sustainable")).toBe("wrong");
    expect(gradeTyped("achievment", "achievement")).toBe("typo");
  });

  it("accepts British and American spellings", () => {
    expect(gradeTyped("analyse", "analyze")).toBe("correct");
    expect(gradeTyped("organization", "organisation")).toBe("correct");
  });

  it("rejects a typo that is another real word", () => {
    expect(gradeTyped("adopt", "adapt", ["adopt", "adapt"])).toBe("wrong");
    expect(gradeTyped("effect", "affect", ["effect"])).toBe("wrong");
  });

  it("is strict on short words", () => {
    expect(gradeTyped("cat", "cut")).toBe("wrong");
  });
});

describe("GuessMonitor", () => {
  it("flags answers faster than the text could be read", () => {
    const m = new GuessMonitor();
    expect(m.record({ ms: 400, chars: 80, correct: true }).tooFast).toBe(true);
    expect(m.record({ ms: minReadMs(80) + 100, chars: 80, correct: true }).tooFast).toBe(false);
  });

  it("locks answers after three fast guesses in a row", () => {
    const m = new GuessMonitor();
    m.record({ ms: 300, chars: 80, correct: false });
    m.record({ ms: 300, chars: 80, correct: false });
    const v = m.record({ ms: 300, chars: 80, correct: false });
    expect(v.message).toMatch(/3 quick guesses/);
    expect(m.currentLockMs).toBe(2000);
  });

  it("calls out always picking the same position", () => {
    const m = new GuessMonitor();
    let last = null as string | null;
    for (let i = 0; i < 5; i++) last = m.record({ ms: 5000, chars: 40, correct: i % 2 === 0, choice: 0 }).message;
    expect(last).toMatch(/Top answer every time/);
  });
});
