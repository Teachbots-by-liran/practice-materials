// Classes, students and assignments, and how they turn into what one student practises.

import type { FlagReason, Pace } from "./types";

export interface ClassRoom {
  id: string;
  name: string;
  joinCode: string;
  archived: boolean;
  createdAt: string;
  /** Words pushed into everyone's boss round, until `focusUntil`. */
  focusWords: string[];
  focusUntil: string | null;
}

export interface Group {
  id: string;
  classId: string;
  name: string;
}

export interface Student {
  id: string;
  classId: string;
  nickname: string;
  pinHash: string;
  groupId: string | null;
  createdAt: string;
  lastSeen: string | null;
  /** Per-student overrides set by the teacher. */
  pace: Pace | null;
  weeklyGoal: number | null;
  failedLogins: number;
  lockedUntil: string | null;
}

export type AssignTarget =
  | { type: "class" }
  | { type: "groups"; groupIds: string[] }
  | { type: "students"; studentIds: string[] };

/**
 * main: the list the class works on. replace: a different main list for some students.
 * addon: an extra list on top of the main one (more new words, not fewer).
 */
export type AssignMode = "main" | "replace" | "addon";

export interface Assignment {
  id: string;
  classId: string;
  listId: string;
  target: AssignTarget;
  mode: AssignMode;
  /** Unlocks automatically once the student has mastered most of the main list. */
  challengeListId: string | null;
  startsOn: string;
  endsOn: string | null;
  weeklyGoal: number;
  pace: Pace;
  createdAt: string;
}

export interface FlagRow {
  id: string;
  classId: string;
  studentId: string;
  listId: string;
  questionId: string;
  reason: FlagReason;
  createdAt: string;
  resolved: boolean;
}

/** A question the teacher hid for everyone (until the content is fixed). */
export interface HiddenQuestion {
  id: string;
  listId: string;
  questionId: string;
  hiddenAt: string;
}

export interface StudyConfig {
  className: string;
  mainListId: string;
  extras: { listId: string; role: "addon" | "challenge" }[];
  weeklyGoal: number;
  pace: Pace;
  focus: string[];
  /** Question ids hidden from this student: teacher-hidden or reported by 2+ students. */
  hidden: string[];
}

/** Share of the main list mastered before a challenge list unlocks. */
export const CHALLENGE_UNLOCK = 0.7;

export function targets(a: Assignment, s: Pick<Student, "id" | "groupId">): boolean {
  if (a.target.type === "class") return true;
  if (a.target.type === "groups") return !!s.groupId && a.target.groupIds.includes(s.groupId);
  return a.target.studentIds.includes(s.id);
}

export function isActive(a: Assignment, today: string): boolean {
  return a.startsOn <= today && (!a.endsOn || today <= a.endsOn);
}

const newest = (a: Assignment, b: Assignment) =>
  b.startsOn.localeCompare(a.startsOn) || b.createdAt.localeCompare(a.createdAt);

export function resolveConfig(args: {
  classRoom: ClassRoom;
  student: Pick<Student, "id" | "groupId" | "pace" | "weeklyGoal">;
  assignments: Assignment[];
  flags: FlagRow[];
  hidden: HiddenQuestion[];
  today: string;
  defaultListId: string;
}): StudyConfig {
  const { classRoom, student, today } = args;
  const mine = args.assignments.filter((a) => a.classId === classRoom.id && isActive(a, today) && targets(a, student));
  const main = mine.filter((a) => a.mode === "replace").sort(newest)[0] ?? mine.filter((a) => a.mode === "main").sort(newest)[0];

  const extras: StudyConfig["extras"] = mine
    .filter((a) => a.mode === "addon" && a.listId !== main?.listId)
    .sort(newest)
    .map((a) => ({ listId: a.listId, role: "addon" as const }));
  if (main?.challengeListId && !extras.some((e) => e.listId === main.challengeListId)) {
    extras.push({ listId: main.challengeListId, role: "challenge" });
  }

  // Reported by two different students and not yet resolved → hidden for everyone.
  const reporters = new Map<string, Set<string>>();
  for (const f of args.flags) {
    if (f.resolved) continue;
    const set = reporters.get(f.questionId) ?? new Set();
    set.add(f.studentId);
    reporters.set(f.questionId, set);
  }
  const hidden = new Set(args.hidden.map((h) => h.questionId));
  for (const [qid, set] of reporters) if (set.size >= 2) hidden.add(qid);

  const focusOn = classRoom.focusUntil && today <= classRoom.focusUntil;
  return {
    className: classRoom.name,
    mainListId: main?.listId ?? args.defaultListId,
    extras,
    weeklyGoal: student.weeklyGoal ?? main?.weeklyGoal ?? 15,
    pace: student.pace ?? main?.pace ?? "normal",
    focus: focusOn ? classRoom.focusWords : [],
    hidden: [...hidden],
  };
}

const CODE_LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";

/** Short codes that are easy to read aloud and type on a phone: "ENG-4821". */
export function makeJoinCode(rng: () => number = Math.random): string {
  const letters = Array.from({ length: 3 }, () => CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)]).join("");
  const digits = String(Math.floor(rng() * 9000) + 1000);
  return `${letters}-${digits}`;
}

export function normalizeCode(code: string): string {
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 7 ? `${c.slice(0, 3)}-${c.slice(3)}` : code.toUpperCase().trim();
}

export function normalizeNickname(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 24);
}
