import { NextRequest, NextResponse } from "next/server";
import { studentFromRequest } from "@/lib/server/auth";
import { saveStudentProgress } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";
import type { StudentProgress } from "@/lib/vocab/types";

const MAX_BYTES = 512 * 1024;

/** Saves the student's progress, merged with what's already stored, and returns the merged copy. */
export async function PUT(req: NextRequest) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "Classes aren't set up." }, { status: 503 });
  const who = studentFromRequest(req);
  if (!who) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "Progress is too large." }, { status: 413 });
  let progress: StudentProgress;
  try {
    progress = JSON.parse(text).progress;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!progress || progress.version !== 1 || typeof progress.words !== "object" || !Array.isArray(progress.answers)) {
    return NextResponse.json({ error: "Invalid progress." }, { status: 400 });
  }
  const merged = await saveStudentProgress(store, who.sid, who.cid, { ...progress, flags: progress.flags ?? [], sentences: progress.sentences ?? [] });
  return NextResponse.json({ progress: merged });
}
