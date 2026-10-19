// Signed tokens for the teacher (a cookie) and students (stored in the app), and PIN hashing.
// The teacher signs in with TEACHER_PASSWORD; there's one teacher, so no accounts.

import crypto from "crypto";

export const TEACHER_COOKIE = "wq_teacher";
const TEACHER_DAYS = 30;
const STUDENT_DAYS = 365;

function secretOrNull(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-secret-not-for-production";
  return null;
}

function secret(): string {
  const s = secretOrNull();
  if (!s) throw new Error("SESSION_SECRET is not set (needs at least 16 characters).");
  return s;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export type TokenPayload = { role: "teacher" } | { role: "student"; sid: string; cid: string };

export function signToken(payload: TokenPayload, days: number): string {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 86_400_000 }));
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined | null): (TokenPayload & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = secretOrNull();
  if (!key) return null;
  const expected = crypto.createHmac("sha256", key).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof p.exp === "number" && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export function teacherToken(): string {
  return signToken({ role: "teacher" }, TEACHER_DAYS);
}

export function studentToken(sid: string, cid: string): string {
  return signToken({ role: "student", sid, cid }, STUDENT_DAYS);
}

export const teacherCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TEACHER_DAYS * 86_400,
};

export function isTeacherToken(token: string | undefined): boolean {
  return verifyToken(token)?.role === "teacher";
}

/** Compares without leaking how much of the password matched. */
export function checkTeacherPassword(given: string): boolean {
  const real = process.env.TEACHER_PASSWORD;
  if (!real) return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Sign-in needs both the password and a secret to sign the session with. */
export function teacherPasswordConfigured(): boolean {
  return !!process.env.TEACHER_PASSWORD && secretOrNull() !== null;
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function checkPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(pin, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

export function studentFromRequest(req: Request): { sid: string; cid: string } | null {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const p = verifyToken(token);
  return p?.role === "student" ? { sid: p.sid, cid: p.cid } : null;
}

export function newId(): string {
  return crypto.randomUUID();
}
