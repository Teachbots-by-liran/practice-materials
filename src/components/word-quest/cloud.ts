// Talking to the server: joining a class, loading the class setup, saving progress.
// Everything keeps working offline; progress syncs when the connection is back.

import type { StudyConfig } from "@/lib/vocab/classroom";
import type { StudentProgress } from "@/lib/vocab/types";

const SESSION_KEY = "word-quest:session:v1";
const CONFIG_KEY = "word-quest:config:v1";

export interface CloudSession {
  token: string;
  nickname: string;
  className: string;
  /** Missing on sessions from before class links existed. */
  classCode?: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadSession = () => read<CloudSession>(SESSION_KEY);
export const saveSession = (s: CloudSession | null) => write(SESSION_KEY, s);
export const loadCachedConfig = () => read<StudyConfig>(CONFIG_KEY);
export const saveCachedConfig = (c: StudyConfig | null) => write(CONFIG_KEY, c);

export async function classesAvailable(): Promise<boolean> {
  try {
    const r = await fetch("/api/wq/status", { cache: "no-store" });
    return r.ok && (await r.json()).classes === true;
  } catch {
    return false;
  }
}

export type JoinResult = { ok: true; session: CloudSession } | { ok: false; error: string };

export async function joinClass(code: string, nickname: string, pin: string): Promise<JoinResult> {
  try {
    const r = await fetch("/api/wq/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, nickname, pin }),
    });
    const body = await r.json();
    if (!r.ok) return { ok: false, error: body.error ?? "Couldn't join. Try again." };
    return { ok: true, session: { token: body.token, nickname: body.nickname, className: body.className, classCode: body.classCode } };
  } catch {
    return { ok: false, error: "No connection. Check your internet and try again." };
  }
}

export type ClassInfo = { ok: true; code: string; name: string } | { ok: false; offline: boolean };

/** Looks up the class behind a join link. */
export async function classInfo(code: string): Promise<ClassInfo> {
  try {
    const r = await fetch(`/api/wq/class?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!r.ok) return { ok: false, offline: r.status >= 500 };
    const body = await r.json();
    return { ok: true, code: body.code, name: body.name };
  } catch {
    return { ok: false, offline: true };
  }
}

/** Whether this phone is already signed in to the class behind a link. */
export function sameClass(s: CloudSession | null, info: { code: string; name: string }): boolean {
  if (!s) return false;
  return s.classCode ? s.classCode === info.code : s.className === info.name;
}

export type MeResult =
  | { status: "ok"; config: StudyConfig; progress: StudentProgress | null; nickname: string }
  | { status: "signed-out" }
  | { status: "offline" };

export async function fetchMe(token: string, today: string): Promise<MeResult> {
  try {
    const r = await fetch(`/api/wq/me?today=${today}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (r.status === 401) return { status: "signed-out" };
    if (!r.ok) return { status: "offline" };
    const body = await r.json();
    return { status: "ok", config: body.config, progress: body.progress, nickname: body.nickname };
  } catch {
    return { status: "offline" };
  }
}

export async function pushProgress(token: string, progress: StudentProgress, keepalive = false): Promise<StudentProgress | null> {
  try {
    const r = await fetch("/api/wq/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ progress }),
      keepalive,
    });
    if (!r.ok) return null;
    return (await r.json()).progress as StudentProgress;
  } catch {
    return null;
  }
}
