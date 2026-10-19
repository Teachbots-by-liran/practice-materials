import { describe, expect, it } from "vitest";
import { makeJoinCode, normalizeCode, resolveConfig, type Assignment, type ClassRoom, type FlagRow } from "./classroom";
import { mergeProgress } from "./merge";
import { emptyProgress } from "./progress";
import { newWordState } from "./scheduler";

const TODAY = "2026-10-20";
const CLASS: ClassRoom = { id: "c1", name: "11-3", joinCode: "ENG-1234", archived: false, createdAt: "2026-09-01", focusWords: [], focusUntil: null };
const student = { id: "s1", groupId: "g-challenge", pace: null, weeklyGoal: null };

function assignment(extra: Partial<Assignment>): Assignment {
  return {
    id: Math.random().toString(36).slice(2),
    classId: "c1",
    listId: "unit1",
    target: { type: "class" },
    mode: "main",
    challengeListId: null,
    startsOn: "2026-10-01",
    endsOn: null,
    weeklyGoal: 15,
    pace: "normal",
    createdAt: "2026-10-01",
    ...extra,
  };
}

const base = { classRoom: CLASS, student, flags: [] as FlagRow[], hidden: [], today: TODAY, defaultListId: "starter" };

describe("resolveConfig", () => {
  it("falls back to the default list with no assignments", () => {
    const c = resolveConfig({ ...base, assignments: [] });
    expect(c.mainListId).toBe("starter");
    expect(c.weeklyGoal).toBe(15);
  });

  it("uses the newest active main assignment", () => {
    const c = resolveConfig({
      ...base,
      assignments: [
        assignment({ listId: "unit1", startsOn: "2026-09-01" }),
        assignment({ listId: "unit2", startsOn: "2026-10-15", weeklyGoal: 20 }),
        assignment({ listId: "unit3", startsOn: "2026-11-01" }),
      ],
    });
    expect(c.mainListId).toBe("unit2");
    expect(c.weeklyGoal).toBe(20);
  });

  it("lets a group's replace assignment take over the main list", () => {
    const c = resolveConfig({
      ...base,
      assignments: [
        assignment({ listId: "unit2" }),
        assignment({ listId: "unit2-support", mode: "replace", target: { type: "groups", groupIds: ["g-support"] } }),
        assignment({ listId: "unit2-hard", mode: "replace", target: { type: "groups", groupIds: ["g-challenge"] } }),
      ],
    });
    expect(c.mainListId).toBe("unit2-hard");
  });

  it("adds add-on lists and the challenge list as extras", () => {
    const c = resolveConfig({
      ...base,
      assignments: [
        assignment({ listId: "unit2", challengeListId: "academic" }),
        assignment({ listId: "idioms", mode: "addon", target: { type: "students", studentIds: ["s1"] } }),
        assignment({ listId: "phrasal", mode: "addon", target: { type: "students", studentIds: ["someone-else"] } }),
      ],
    });
    expect(c.extras).toEqual([
      { listId: "idioms", role: "addon" },
      { listId: "academic", role: "challenge" },
    ]);
  });

  it("applies per-student pace and goal overrides", () => {
    const c = resolveConfig({ ...base, student: { ...student, pace: "boost", weeklyGoal: 25 }, assignments: [assignment({})] });
    expect(c.pace).toBe("boost");
    expect(c.weeklyGoal).toBe(25);
  });

  it("hides a question reported by two different students", () => {
    const flag = (studentId: string, questionId: string): FlagRow => ({
      id: studentId + questionId, classId: "c1", studentId, listId: "unit1", questionId, reason: "two-answers", createdAt: TODAY, resolved: false,
    });
    const c = resolveConfig({
      ...base,
      assignments: [],
      flags: [flag("a", "q1"), flag("b", "q1"), flag("a", "q2"), flag("a", "q2")],
    });
    expect(c.hidden).toEqual(["q1"]);
  });
});

describe("join codes", () => {
  it("look like ABC-1234 and normalize from sloppy typing", () => {
    expect(makeJoinCode()).toMatch(/^[A-Z]{3}-\d{4}$/);
    expect(normalizeCode(" eng 4821 ")).toBe("ENG-4821");
    expect(normalizeCode("eng-4821")).toBe("ENG-4821");
  });
});

describe("mergeProgress", () => {
  it("keeps the more recent state of each word and everything from both sides", () => {
    const a = emptyProgress("Noa", "starter");
    const b = emptyProgress("Noa", "starter");
    a.words.achieve = { ...newWordState("achieve", "starter", "2026-10-10"), lastReview: "2026-10-12", reps: 2, correctDays: ["2026-10-11"] };
    b.words.achieve = { ...newWordState("achieve", "starter", "2026-10-10"), lastReview: "2026-10-15", reps: 3, correctDays: ["2026-10-15"] };
    b.words.reveal = newWordState("reveal", "starter", "2026-10-15");
    a.activeDays = ["2026-10-11", "2026-10-12"];
    b.activeDays = ["2026-10-12", "2026-10-15"];
    a.sentences = [{ word: "achieve", listId: "starter", text: "I achieved it.", date: "2026-10-12" }];
    const m = mergeProgress(a, b);
    expect(m.words.achieve.reps).toBe(3);
    expect(m.words.achieve.correctDays).toEqual(["2026-10-11", "2026-10-15"]);
    expect(m.words.reveal).toBeDefined();
    expect(m.activeDays).toEqual(["2026-10-11", "2026-10-12", "2026-10-15"]);
    expect(m.sentences).toHaveLength(1);
  });
});
