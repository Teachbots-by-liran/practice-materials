// Student progress: saving, and the numbers shown on the home screen.
// Version 1 keeps progress on the device (localStorage). The cloud sync in
// milestone 2 reads and writes the same StudentProgress shape.

import { addDays, daysBetween } from "./dates";
import { listStates, newThisWeek } from "./scheduler";
import type { StudentProgress, WordList } from "./types";

const KEY = "word-quest:progress:v1";
const MAX_ANSWERS = 400;

export function emptyProgress(name: string, listId: string): StudentProgress {
  return {
    version: 1,
    name,
    listId,
    placementDone: false,
    weeklyGoal: 15,
    pace: "normal",
    xp: 0,
    activeDays: [],
    words: {},
    answers: [],
    sentences: [],
    flags: [],
    settings: { sound: true },
  };
}

export function loadProgress(): StudentProgress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StudentProgress;
    if (p.version !== 1) return null;
    return { ...p, flags: p.flags ?? [] };
  } catch {
    return null;
  }
}

export function saveProgress(p: StudentProgress): void {
  try {
    const trimmed = p.answers.length > MAX_ANSWERS ? { ...p, answers: p.answers.slice(-MAX_ANSWERS) } : p;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or blocked (private mode): practice still works, it just isn't saved.
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Consecutive practice days up to today (or yesterday, if today isn't done yet).
 * One missed day per 7 is forgiven automatically: a "streak freeze".
 */
export function streak(activeDays: string[], today: string): { count: number; frozen: string[] } {
  const days = new Set(activeDays);
  let day = days.has(today) ? today : addDays(today, -1);
  if (!days.has(day)) return { count: 0, frozen: [] };
  let count = 0;
  const frozen: string[] = [];
  while (true) {
    if (days.has(day)) {
      count++;
      day = addDays(day, -1);
      continue;
    }
    const lastFreeze = frozen[frozen.length - 1];
    const freezeOk = !lastFreeze || daysBetween(day, lastFreeze) >= 7;
    if (freezeOk && days.has(addDays(day, -1))) {
      frozen.push(day);
      day = addDays(day, -1);
      continue;
    }
    break;
  }
  return { count, frozen };
}

export interface ListStats {
  total: number;
  mastered: number;
  learning: number;
  notStarted: number;
  newThisWeek: number;
}

export function listStats(p: StudentProgress, list: WordList, today: string): ListStats {
  const states = listStates(p, list);
  const mastered = states.filter((s) => s.stage === "mastered").length;
  return {
    total: list.words.length,
    mastered,
    learning: states.length - mastered,
    notStarted: list.words.length - states.length,
    newThisWeek: newThisWeek(p, list, today),
  };
}

export function markActive(p: StudentProgress, today: string): StudentProgress {
  return p.activeDays.includes(today) ? p : { ...p, activeDays: [...p.activeDays, today].slice(-120) };
}
