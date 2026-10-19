// Runs the content checker over every bundled word list.
// `npm run check:words` runs just this file.

import { describe, expect, it } from "vitest";
import { WORD_LISTS } from "./lists";
import { validateList } from "./validate";

describe.each(WORD_LISTS.map((l) => [l.id, l] as const))("word list %s", (_id, list) => {
  it("passes the content checks", () => {
    const problems = validateList(list).map((p) => `${p.word}${p.id ? ` (${p.id})` : ""}: ${p.message}`);
    expect(problems).toEqual([]);
  });
});

describe("validateList", () => {
  it("catches a broken question", () => {
    const list = structuredClone(WORD_LISTS[0]);
    const q = list.words[0].questions.find((x) => x.type === "chat");
    if (q && q.type === "chat") q.answer = "banana";
    expect(validateList(list).some((p) => p.message.includes("not a form of the word"))).toBe(true);
  });
});
