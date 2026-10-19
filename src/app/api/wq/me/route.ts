import { NextRequest, NextResponse } from "next/server";
import { studentFromRequest } from "@/lib/server/auth";
import { getMe } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";

/** The student's class setup (lists, goal, pace, hidden questions) and their saved progress. */
export async function GET(req: NextRequest) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "Classes aren't set up." }, { status: 503 });
  const who = studentFromRequest(req);
  if (!who) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const today = req.nextUrl.searchParams.get("today") ?? new Date().toISOString().slice(0, 10);
  const me = await getMe(store, who.sid, who.cid, today);
  if (!me) return NextResponse.json({ error: "This account no longer exists. Join your class again." }, { status: 401 });
  return NextResponse.json(me);
}
