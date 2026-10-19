import { describe, expect, it } from "vitest";
import type { StudyConfig } from "./classroom";
import { getList } from "./lists";
import { emptyProgress } from "./progress";
import { newWordState } from "./scheduler";
import { needsPlacement, studyLists } from "./study";

const TODAY = "2026-10-20";
const config = (extra: Partial<StudyConfig> = {}): StudyConfig => ({
  className: "11-3",
  mainListId: "band3-starter",
  extras: [],
  weeklyGoal: 15,
  pace: "normal",
  focus: [],
  hidden: [],
  ...extra,
});

describe("studyLists", () => {
  it("keeps the challenge list locked until 70% of the main list is mastered", () => {
    const p = emptyProgress("Noa", "band3-starter");
    const cfg = config({ extras: [{ listId: "band3-set2", role: "challenge" }] });
    expect(studyLists(cfg, p).lockedChallenge?.id).toBe("band3-set2");

    const main = getList("band3-starter")!;
    for (const w of main.words.slice(0, 9)) p.words[w.word] = { ...newWordState(w.word, main.id, TODAY), stage: "mastered" };
    const unlocked = studyLists(cfg, p);
    expect(unlocked.lockedChallenge).toBeNull();
    expect(unlocked.extras.map((e) => e.list.id)).toEqual(["band3-set2"]);
  });

  it("keeps started words from earlier lists in review", () => {
    const p = emptyProgress("Noa", "band3-starter");
    p.words.achieve = newWordState("achieve", "band3-starter", TODAY);
    const l = studyLists(config({ mainListId: "band3-set2" }), p);
    expect(l.main.id).toBe("band3-set2");
    expect(l.reviewOnly.map((x) => x.id)).toEqual(["band3-starter"]);
    expect(l.sourceOf.get("achieve")).toBe("band3-starter");
  });

  it("hides questions the teacher hid and ones this student reported", () => {
    const p = emptyProgress("Noa", "band3-starter");
    p.flags = [{ listId: "band3-starter", questionId: "achieve-2", reason: "confusing", date: TODAY }];
    const l = studyLists(config({ hidden: ["achieve-3"] }), p);
    const ids = l.main.words.find((w) => w.word === "achieve")!.questions.map((q) => q.id);
    expect(ids).not.toContain("achieve-2");
    expect(ids).not.toContain("achieve-3");
  });

  it("asks for a placement check once per main list", () => {
    const p = { ...emptyProgress("Noa", "band3-starter"), placedLists: ["band3-starter"] };
    expect(needsPlacement(p, "band3-starter")).toBe(false);
    expect(needsPlacement(p, "band3-set2")).toBe(true);
  });
});
