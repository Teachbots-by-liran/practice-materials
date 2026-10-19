import { NextRequest, NextResponse } from "next/server";
import { checkTeacherPassword, TEACHER_COOKIE, teacherCookieOptions, teacherPasswordConfigured, teacherToken } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  if (!teacherPasswordConfigured()) {
    return NextResponse.json({ error: "TEACHER_PASSWORD isn't set on the server yet." }, { status: 503 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // A short pause makes guessing the password slow.
  await new Promise((r) => setTimeout(r, 400));
  if (!password || !checkTeacherPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TEACHER_COOKIE, teacherToken(), teacherCookieOptions);
  return res;
}
