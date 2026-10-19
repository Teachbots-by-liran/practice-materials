// What the API and teacher portal do with class data.

import { addDays, daysBetween, weekStart } from "@/lib/vocab/dates";
import {
  makeJoinCode,
  normalizeCode,
  normalizeNickname,
  resolveConfig,
  type Assignment,
  type ClassRoom,
  type FlagRow,
  type Group,
  type HiddenQuestion,
  type Student,
  type StudyConfig,
} from "@/lib/vocab/classroom";
import { DEFAULT_LIST_ID, getList, WORD_LISTS } from "@/lib/vocab/lists";
import { mergeProgress } from "@/lib/vocab/merge";
import { streak } from "@/lib/vocab/progress";
import type { Pace, StudentProgress, WordState } from "@/lib/vocab/types";
import { checkPin, hashPin, newId, studentToken } from "./auth";
import type { Store } from "./store";

export interface ProgressRow {
  id: string; // student id
  classId: string;
  data: StudentProgress;
  updatedAt: string;
}

// ── Students ───────────────────────────────────────────────────────

export class JoinError extends Error {
  constructor(
    public code: "bad-input" | "no-class" | "wrong-pin" | "locked",
    message: string,
  ) {
    super(message);
  }
}

const MAX_FAILED = 5;
const LOCK_MINUTES = 10;

export async function joinClass(
  store: Store,
  input: { code: string; nickname: string; pin: string },
  now = new Date(),
): Promise<{ token: string; student: Student; classRoom: ClassRoom; created: boolean }> {
  const nickname = normalizeNickname(input.nickname ?? "");
  const pin = String(input.pin ?? "");
  if (!nickname) throw new JoinError("bad-input", "Type a nickname.");
  if (!/^\d{4}$/.test(pin)) throw new JoinError("bad-input", "Your PIN needs exactly 4 digits.");

  const code = normalizeCode(input.code ?? "");
  const classRoom = (await store.list<ClassRoom>("classes")).find((c) => c.joinCode === code && !c.archived);
  if (!classRoom) throw new JoinError("no-class", "No class has that code. Check it with your teacher.");

  const students = await store.list<Student>("students", classRoom.id);
  const existing = students.find((s) => s.nickname.toLowerCase() === nickname.toLowerCase());
  const iso = now.toISOString();

  if (existing) {
    if (existing.lockedUntil && existing.lockedUntil > iso) {
      throw new JoinError("locked", "Too many wrong PINs. Wait 10 minutes, or ask your teacher to reset your PIN.");
    }
    if (!checkPin(pin, existing.pinHash)) {
      const failed = existing.failedLogins + 1;
      await store.put("students", {
        ...existing,
        failedLogins: failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : existing.lockedUntil,
      });
      throw new JoinError(
        "wrong-pin",
        `Someone in this class already uses the name “${existing.nickname}”. If that's you, your PIN is wrong. If not, pick another name.`,
      );
    }
    const student = { ...existing, failedLogins: 0, lockedUntil: null, lastSeen: iso };
    await store.put("students", student);
    return { token: studentToken(student.id, classRoom.id), student, classRoom, created: false };
  }

  const student: Student = {
    id: newId(),
    classId: classRoom.id,
    nickname,
    pinHash: hashPin(pin),
    groupId: null,
    createdAt: iso,
    lastSeen: iso,
    pace: null,
    weeklyGoal: null,
    failedLogins: 0,
    lockedUntil: null,
  };
  await store.put("students", student);
  return { token: studentToken(student.id, classRoom.id), student, classRoom, created: true };
}

export async function getStudyConfig(store: Store, student: Student, classRoom: ClassRoom, today: string): Promise<StudyConfig> {
  const [assignments, flags, hidden] = await Promise.all([
    store.list<Assignment>("assignments", classRoom.id),
    store.list<FlagRow>("flags", classRoom.id),
    store.list<HiddenQuestion>("hidden"),
  ]);
  return resolveConfig({ classRoom, student, assignments, flags, hidden, today, defaultListId: DEFAULT_LIST_ID });
}

export async function getMe(store: Store, sid: string, cid: string, today: string) {
  const student = await store.get<Student>("students", sid);
  if (!student || student.classId !== cid) return null;
  const classRoom = await store.get<ClassRoom>("classes", cid);
  if (!classRoom) return null;
  const [config, row] = await Promise.all([getStudyConfig(store, student, classRoom, today), store.get<ProgressRow>("progress", sid)]);
  await store.put("students", { ...student, lastSeen: new Date().toISOString() });
  return { nickname: student.nickname, config, progress: row?.data ?? null };
}

export async function saveStudentProgress(store: Store, sid: string, cid: string, incoming: StudentProgress): Promise<StudentProgress> {
  const row = await store.get<ProgressRow>("progress", sid);
  const merged = row ? mergeProgress(row.data, incoming) : incoming;
  await store.put<ProgressRow>("progress", { id: sid, classId: cid, data: merged, updatedAt: new Date().toISOString() });

  // Questions the student reported become flags in the teacher's inbox.
  for (const f of incoming.flags) {
    const id = `${sid}:${f.listId}:${f.questionId}`;
    if (await store.get("flags", id)) continue;
    await store.put<FlagRow>("flags", {
      id,
      classId: cid,
      studentId: sid,
      listId: f.listId,
      questionId: f.questionId,
      reason: f.reason,
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }
  return merged;
}

// ── Teacher: classes, groups, students ─────────────────────────────

export async function createClass(store: Store, name: string): Promise<ClassRoom> {
  const existing = new Set((await store.list<ClassRoom>("classes")).map((c) => c.joinCode));
  let joinCode = makeJoinCode();
  while (existing.has(joinCode)) joinCode = makeJoinCode();
  const c: ClassRoom = {
    id: newId(),
    name: name.trim().slice(0, 60) || "My class",
    joinCode,
    archived: false,
    createdAt: new Date().toISOString(),
    focusWords: [],
    focusUntil: null,
  };
  await store.put("classes", c);
  return c;
}

export async function createGroup(store: Store, classId: string, name: string): Promise<Group> {
  const g: Group = { id: newId(), classId, name: name.trim().slice(0, 40) || "Group" };
  await store.put("groups", g);
  return g;
}

export async function deleteGroup(store: Store, classId: string, groupId: string): Promise<void> {
  await store.remove("groups", groupId);
  for (const s of await store.list<Student>("students", classId)) {
    if (s.groupId === groupId) await store.put("students", { ...s, groupId: null });
  }
}

export async function updateStudent(
  store: Store,
  sid: string,
  changes: { groupId?: string | null; pace?: Pace | null; weeklyGoal?: number | null; pin?: string },
): Promise<void> {
  const s = await store.get<Student>("students", sid);
  if (!s) return;
  const next: Student = { ...s };
  if (changes.groupId !== undefined) next.groupId = changes.groupId;
  if (changes.pace !== undefined) next.pace = changes.pace;
  if (changes.weeklyGoal !== undefined) next.weeklyGoal = changes.weeklyGoal;
  if (changes.pin) {
    next.pinHash = hashPin(changes.pin);
    next.failedLogins = 0;
    next.lockedUntil = null;
  }
  await store.put("students", next);
}

export async function removeStudent(store: Store, sid: string): Promise<void> {
  await store.remove("students", sid);
  await store.remove("progress", sid);
}

// ── Teacher: dashboard numbers ─────────────────────────────────────

export interface StudentSummary {
  id: string;
  nickname: string;
  groupId: string | null;
  lastSeen: string | null;
  activeDays7: number;
  streak: number;
  mastered: number;
  learning: number;
  newThisWeek: number;
  weeklyGoal: number;
  accuracy7: number | null;
  /** Share of answers in the last 7 days too fast to have been read. */
  rushing7: number | null;
  hints7: number;
  answers7: number;
  xp: number;
  pace: Pace | null;
  needsAttention: string[];
}

export interface WordDifficulty {
  word: string;
  students: number;
  errorRate: number;
  lapses: number;
}

function last7(today: string) {
  const from = addDays(today, -6);
  return (d: string) => d >= from && d <= today;
}

export function summarize(student: Student, p: StudentProgress | null, config: StudyConfig, today: string): StudentSummary {
  const inWeek = last7(today);
  const words = p ? Object.values(p.words) : [];
  const answers = (p?.answers ?? []).filter((a) => inWeek(a.date));
  const fast = answers.filter((a) => a.tooFast).length;
  const right = answers.filter((a) => a.correct && !a.tooFast).length;
  const main = getList(config.mainListId);
  const weekStartKey = weekStart(today);
  const newThisWeek = main ? main.words.filter((w) => p?.words[w.word] && !p.words[w.word].known && p.words[w.word].introduced >= weekStartKey).length : 0;
  const activeDays7 = (p?.activeDays ?? []).filter(inWeek).length;

  const s: StudentSummary = {
    id: student.id,
    nickname: student.nickname,
    groupId: student.groupId,
    lastSeen: student.lastSeen,
    activeDays7,
    streak: p ? streak(p.activeDays, today).count : 0,
    mastered: words.filter((w) => w.stage === "mastered").length,
    learning: words.filter((w) => w.stage !== "mastered").length,
    newThisWeek,
    weeklyGoal: config.weeklyGoal,
    accuracy7: answers.length >= 5 ? right / answers.length : null,
    rushing7: answers.length >= 5 ? fast / answers.length : null,
    hints7: (p?.answers ?? []).filter((a) => inWeek(a.date) && a.hinted).length,
    answers7: answers.length,
    xp: p?.xp ?? 0,
    pace: student.pace,
    needsAttention: [],
  };

  const lastActive = p?.activeDays.slice().sort().at(-1);
  if (!lastActive) s.needsAttention.push("Hasn't started yet");
  else if (daysBetween(lastActive, today) >= 4) s.needsAttention.push(`No practice for ${days(daysBetween(lastActive, today))}`);
  if (s.rushing7 !== null && s.rushing7 >= 0.2) s.needsAttention.push("Rushing: many answers too fast to read");
  if (s.accuracy7 !== null && s.accuracy7 < 0.6) s.needsAttention.push("Accuracy below 60% this week");
  return s;
}

export function hardestWords(progressList: (StudentProgress | null)[], minStudents = 2): WordDifficulty[] {
  const stats = new Map<string, { students: Set<number>; tries: number; wrong: number; lapses: number }>();
  progressList.forEach((p, i) => {
    if (!p) return;
    for (const a of p.answers) {
      const st = stats.get(a.word) ?? { students: new Set(), tries: 0, wrong: 0, lapses: 0 };
      st.students.add(i);
      st.tries++;
      if (!a.correct || a.tooFast) st.wrong++;
      stats.set(a.word, st);
    }
    for (const w of Object.values(p.words) as WordState[]) {
      const st = stats.get(w.word);
      if (st) st.lapses += w.lapses;
    }
  });
  return [...stats.entries()]
    .filter(([, s]) => s.students.size >= minStudents && s.tries >= 4)
    .map(([word, s]) => ({ word, students: s.students.size, errorRate: s.wrong / s.tries, lapses: s.lapses }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);
}

export async function classOverview(store: Store, classId: string, today: string) {
  const classRoom = await store.get<ClassRoom>("classes", classId);
  if (!classRoom) return null;
  const [students, groups, assignments, flags, rows] = await Promise.all([
    store.list<Student>("students", classId),
    store.list<Group>("groups", classId),
    store.list<Assignment>("assignments", classId),
    store.list<FlagRow>("flags", classId),
    store.list<ProgressRow>("progress", classId),
  ]);
  const byStudent = new Map(rows.map((r) => [r.id, r.data]));
  const hidden = await store.list<HiddenQuestion>("hidden");
  const summaries = students
    .map((s) => {
      const config = resolveConfig({ classRoom, student: s, assignments, flags, hidden, today, defaultListId: DEFAULT_LIST_ID });
      return summarize(s, byStudent.get(s.id) ?? null, config, today);
    })
    .sort((a, b) => a.nickname.localeCompare(b.nickname));
  return {
    classRoom,
    students: summaries,
    groups,
    assignments: assignments.sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
    openFlags: flags.filter((f) => !f.resolved).length,
    hardest: hardestWords(students.map((s) => byStudent.get(s.id) ?? null)),
    sentences: rows.reduce((n, r) => n + r.data.sentences.length, 0),
  };
}

export async function studentDetail(store: Store, sid: string, today: string) {
  const student = await store.get<Student>("students", sid);
  if (!student) return null;
  const classRoom = await store.get<ClassRoom>("classes", student.classId);
  if (!classRoom) return null;
  const [config, row, groups] = await Promise.all([
    getStudyConfig(store, student, classRoom, today),
    store.get<ProgressRow>("progress", sid),
    store.list<Group>("groups", student.classId),
  ]);
  const p = row?.data ?? null;
  const words = Object.values(p?.words ?? {})
    .map((w) => ({ ...w, why: whyScheduled(w, today) }))
    .sort((a, b) => a.due.localeCompare(b.due));
  return { student, classRoom, config, progress: p, summary: summarize(student, p, config, today), words, groups };
}

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/** Plain-language reason a word comes back when it does. */
export function whyScheduled(w: WordState, today: string): string {
  if (w.stage === "mastered") return `Mastered · check-up ${w.due <= today ? "due now" : `in ${days(daysBetween(today, w.due))}`}`;
  if (w.lastCorrect === false) return "Missed last time · back the next day";
  if (w.hints > 0 && w.reps < 3) return "Needed a hint · coming back sooner";
  if (w.known && w.reps === 0) return "Knew it at placement · harder questions";
  if (w.due <= today) return "Due for review today";
  return `Remembered · next review in ${days(daysBetween(today, w.due))}`;
}

// ── Teacher: assignments, focus words ──────────────────────────────

export async function saveAssignment(store: Store, a: Omit<Assignment, "id" | "createdAt"> & { id?: string }): Promise<void> {
  if (!getList(a.listId)) throw new Error("Unknown word list");
  if (a.challengeListId && !getList(a.challengeListId)) throw new Error("Unknown challenge list");
  const row: Assignment = { ...a, id: a.id ?? newId(), createdAt: new Date().toISOString() };
  await store.put("assignments", row);
}

export async function setFocusWords(store: Store, classId: string, words: string[], until: string | null): Promise<void> {
  const c = await store.get<ClassRoom>("classes", classId);
  if (c) await store.put("classes", { ...c, focusWords: words, focusUntil: until });
}

// ── Teacher: reported questions ────────────────────────────────────

export interface FlaggedQuestion {
  listId: string;
  questionId: string;
  word: string;
  reasons: Record<string, number>;
  reporters: number;
  hidden: boolean;
  question: unknown;
  flagIds: string[];
}

export async function flaggedQuestions(store: Store): Promise<FlaggedQuestion[]> {
  const [flags, hidden] = await Promise.all([store.list<FlagRow>("flags"), store.list<HiddenQuestion>("hidden")]);
  const groups = new Map<string, FlaggedQuestion>();
  for (const f of flags.filter((x) => !x.resolved)) {
    const key = `${f.listId}:${f.questionId}`;
    const list = getList(f.listId);
    const entry = list?.words.find((w) => w.questions.some((q) => q.id === f.questionId));
    const g = groups.get(key) ?? {
      listId: f.listId,
      questionId: f.questionId,
      word: entry?.word ?? "?",
      reasons: {},
      reporters: 0,
      hidden: hidden.some((h) => h.questionId === f.questionId),
      question: entry?.questions.find((q) => q.id === f.questionId) ?? null,
      flagIds: [],
    };
    g.reasons[f.reason] = (g.reasons[f.reason] ?? 0) + 1;
    g.reporters++;
    g.flagIds.push(f.id);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.reporters - a.reporters);
}

export async function resolveFlags(store: Store, flagIds: string[]): Promise<void> {
  for (const id of flagIds) {
    const f = await store.get<FlagRow>("flags", id);
    if (f) await store.put("flags", { ...f, resolved: true });
  }
}

export async function setHidden(store: Store, listId: string, questionId: string, hide: boolean): Promise<void> {
  const id = `${listId}:${questionId}`;
  if (hide) await store.put<HiddenQuestion>("hidden", { id, listId, questionId, hiddenAt: new Date().toISOString() });
  else await store.remove("hidden", id);
}

// ── Export ─────────────────────────────────────────────────────────

/** Students' own sentences, ready to paste into Claude Code for feedback. */
export async function exportSentences(store: Store, classId: string, since?: string): Promise<string> {
  const classRoom = await store.get<ClassRoom>("classes", classId);
  const students = new Map((await store.list<Student>("students", classId)).map((s) => [s.id, s.nickname]));
  const rows = await store.list<ProgressRow>("progress", classId);
  const lines: string[] = [
    `# Student sentences: ${classRoom?.name ?? classId}`,
    "",
    `Exported ${new Date().toISOString().slice(0, 10)}${since ? `, sentences since ${since}` : ""}. Each line: student · target word · date · sentence.`,
    "",
    "Ask Claude: “Give feedback on these sentences: is the target word used correctly and naturally? Group common mistakes, and suggest a short lesson on the most common one.”",
    "",
  ];
  for (const r of rows.sort((a, b) => (students.get(a.id) ?? "").localeCompare(students.get(b.id) ?? ""))) {
    const sentences = r.data.sentences.filter((s) => !since || s.date >= since);
    if (!sentences.length) continue;
    lines.push(`## ${students.get(r.id) ?? "Unknown student"}`, "");
    for (const s of sentences) lines.push(`- **${s.word}** · ${s.date} · ${s.text.replace(/\s+/g, " ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

export const AVAILABLE_LISTS = WORD_LISTS.map((l) => ({ id: l.id, title: l.title, words: l.words.length }));
