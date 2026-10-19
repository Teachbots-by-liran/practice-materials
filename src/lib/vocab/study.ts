// Turns a student's class setup into the lists the app practises from.

import { CHALLENGE_UNLOCK, type StudyConfig } from "./classroom";
import { DEFAULT_LIST_ID, getList, WORD_LISTS } from "./lists";
import { combineLists, listStates } from "./scheduler";
import type { StudentProgress, WordList } from "./types";

export interface StudyLists {
  main: WordList;
  /** Lists mixed into sessions with ⭐: add-ons, and the challenge list once unlocked. */
  extras: { list: WordList; role: "addon" | "challenge" }[];
  /** The challenge list, while it's still locked. */
  lockedChallenge: WordList | null;
  /** Earlier lists with words the student has started: reviewed, no new words. */
  reviewOnly: WordList[];
  /** Everything above in one list, for looking up words and questions. */
  combined: WordList;
  /** Which list each word belongs to, for saving progress and reports. */
  sourceOf: Map<string, string>;
}

export function localConfig(p: StudentProgress): StudyConfig {
  return {
    className: "",
    mainListId: p.listId || DEFAULT_LIST_ID,
    extras: [],
    weeklyGoal: p.weeklyGoal,
    pace: p.pace,
    focus: [],
    hidden: [],
  };
}

export function masteredShare(p: StudentProgress, list: WordList): number {
  if (!list.words.length) return 0;
  return listStates(p, list).filter((s) => s.stage === "mastered").length / list.words.length;
}

function withoutHidden(list: WordList, hidden: Set<string>): WordList {
  if (!hidden.size) return list;
  return { ...list, words: list.words.map((w) => ({ ...w, questions: w.questions.filter((q) => !hidden.has(q.id)) })) };
}

export function studyLists(config: StudyConfig, p: StudentProgress): StudyLists {
  const hidden = new Set([...config.hidden, ...p.flags.map((f) => f.questionId)]);
  const mainRaw = getList(config.mainListId) ?? WORD_LISTS[0];
  const main = withoutHidden(mainRaw, hidden);

  const extras: StudyLists["extras"] = [];
  let lockedChallenge: WordList | null = null;
  for (const e of config.extras) {
    const l = getList(e.listId);
    if (!l || l.id === main.id) continue;
    if (e.role === "challenge" && masteredShare(p, mainRaw) < CHALLENGE_UNLOCK) {
      lockedChallenge = l;
      continue;
    }
    extras.push({ list: withoutHidden(l, hidden), role: e.role });
  }

  const active = new Set([main.id, ...extras.map((e) => e.list.id)]);
  const reviewOnly = WORD_LISTS.filter((l) => !active.has(l.id) && l.words.some((w) => p.words[w.word])).map((l) =>
    withoutHidden(l, hidden),
  );

  const ordered = [main, ...extras.map((e) => e.list), ...reviewOnly];
  const sourceOf = new Map<string, string>();
  for (const l of ordered) for (const w of l.words) if (!sourceOf.has(w.word)) sourceOf.set(w.word, l.id);

  return {
    main,
    extras,
    lockedChallenge,
    reviewOnly,
    combined: combineLists(main, ordered.slice(1)),
    sourceOf,
  };
}

/** Applies the teacher's goal and pace to the student's progress. */
export function withConfig(p: StudentProgress, config: StudyConfig): StudentProgress {
  if (p.weeklyGoal === config.weeklyGoal && p.pace === config.pace && p.listId === config.mainListId) return p;
  return { ...p, weeklyGoal: config.weeklyGoal, pace: config.pace, listId: config.mainListId };
}

export function needsPlacement(p: StudentProgress, listId: string): boolean {
  const placed = p.placedLists ?? (p.placementDone ? [p.listId] : []);
  return !placed.includes(listId);
}
