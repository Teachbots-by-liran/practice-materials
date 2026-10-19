import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/lib/vocab/progress";
import { newWordState } from "@/lib/vocab/scheduler";
import type { Student } from "@/lib/vocab/classroom";
import { verifyToken } from "./auth";
import {
  classOverview,
  createClass,
  exportSentences,
  flaggedQuestions,
  getMe,
  joinClass,
  JoinError,
  saveAssignment,
  saveStudentProgress,
  updateStudent,
} from "./repo";
import { memoryStore } from "./store";

const TODAY = "2026-10-20";

describe("joining a class", () => {
  it("creates a student the first time and signs them back in with the same PIN", async () => {
    const store = memoryStore();
    const c = await createClass(store, "11-3");
    const first = await joinClass(store, { code: c.joinCode.toLowerCase(), nickname: " Noa ", pin: "1234" });
    expect(first.created).toBe(true);
    expect(verifyToken(first.token)).toMatchObject({ role: "student", sid: first.student.id, cid: c.id });

    const again = await joinClass(store, { code: c.joinCode, nickname: "noa", pin: "1234" });
    expect(again.created).toBe(false);
    expect(again.student.id).toBe(first.student.id);
  });

  it("rejects a wrong PIN for a taken name and locks after 5 tries", async () => {
    const store = memoryStore();
    const c = await createClass(store, "11-3");
    await joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "1234" });
    for (let i = 0; i < 5; i++) {
      await expect(joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "9999" })).rejects.toMatchObject({ code: "wrong-pin" });
    }
    await expect(joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "1234" })).rejects.toMatchObject({ code: "locked" });
  });

  it("explains bad input and unknown codes", async () => {
    const store = memoryStore();
    await expect(joinClass(store, { code: "XYZ-0000", nickname: "Noa", pin: "1234" })).rejects.toBeInstanceOf(JoinError);
    const c = await createClass(store, "11-3");
    await expect(joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "12" })).rejects.toMatchObject({ code: "bad-input" });
  });

  it("lets the teacher reset a PIN", async () => {
    const store = memoryStore();
    const c = await createClass(store, "11-3");
    const { student } = await joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "1234" });
    await updateStudent(store, student.id, { pin: "5555" });
    await expect(joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "5555" })).resolves.toMatchObject({ created: false });
  });
});

describe("progress and the teacher view", () => {
  it("saves progress, turns reports into flags and shows up in the overview and export", async () => {
    const store = memoryStore();
    const c = await createClass(store, "11-3");
    await saveAssignment(store, {
      classId: c.id, listId: "band3-starter", target: { type: "class" }, mode: "main", challengeListId: null,
      startsOn: "2026-10-01", endsOn: null, weeklyGoal: 12, pace: "normal",
    });
    const { student } = await joinClass(store, { code: c.joinCode, nickname: "Noa", pin: "1234" });

    const p = emptyProgress("Noa", "band3-starter");
    p.words.achieve = { ...newWordState("achieve", "band3-starter", TODAY), lapses: 2 };
    p.activeDays = [TODAY];
    p.answers = Array.from({ length: 10 }, (_, i) => ({ date: TODAY, word: "achieve", questionId: "achieve-2", correct: i % 2 === 0, hinted: false, tooFast: i < 3, ms: 900 }));
    p.flags = [{ listId: "band3-starter", questionId: "achieve-2", reason: "two-answers", date: TODAY }];
    p.sentences = [{ word: "achieve", listId: "band3-starter", text: "I want to achieve good grades.", date: TODAY }];
    await saveStudentProgress(store, student.id, c.id, p);

    const me = await getMe(store, student.id, c.id, TODAY);
    expect(me?.config.mainListId).toBe("band3-starter");
    expect(me?.config.weeklyGoal).toBe(12);
    expect(me?.progress?.words.achieve).toBeDefined();

    const overview = await classOverview(store, c.id, TODAY);
    const row = overview!.students[0];
    expect(row.nickname).toBe("Noa");
    expect(row.rushing7).toBeCloseTo(0.3);
    expect(row.needsAttention).toContain("Rushing: many answers too fast to read");
    expect(overview!.openFlags).toBe(1);

    const flagged = await flaggedQuestions(store);
    expect(flagged[0]).toMatchObject({ questionId: "achieve-2", word: "achieve", reporters: 1 });

    const md = await exportSentences(store, c.id);
    expect(md).toContain("I want to achieve good grades.");
  });

  it("refuses a student token for another class", async () => {
    const store = memoryStore();
    const a = await createClass(store, "A");
    const b = await createClass(store, "B");
    const { student } = await joinClass(store, { code: a.joinCode, nickname: "Noa", pin: "1234" });
    expect(await getMe(store, student.id, b.id, TODAY)).toBeNull();
    expect((await store.get<Student>("students", student.id))?.classId).toBe(a.id);
  });
});
