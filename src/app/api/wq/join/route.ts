import { NextRequest, NextResponse } from "next/server";
import { JoinError, joinClass } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "Classes aren't set up yet. Ask your teacher." }, { status: 503 });

  let body: { code?: string; nickname?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const r = await joinClass(store, { code: body.code ?? "", nickname: body.nickname ?? "", pin: body.pin ?? "" });
    return NextResponse.json({ token: r.token, nickname: r.student.nickname, className: r.classRoom.name, created: r.created });
  } catch (err) {
    if (err instanceof JoinError) {
      const status = err.code === "locked" ? 429 : err.code === "no-class" ? 404 : err.code === "wrong-pin" ? 401 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("join failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again in a minute." }, { status: 500 });
  }
}
