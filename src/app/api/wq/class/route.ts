import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";
import { normalizeCode, type ClassRoom } from "@/lib/vocab/classroom";

/** The class behind a join link: just its name, so the app can say "Join 11-3 English". */
export async function GET(req: NextRequest) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "Classes aren't set up." }, { status: 503 });
  const code = normalizeCode(req.nextUrl.searchParams.get("code") ?? "");
  const c = (await store.list<ClassRoom>("classes")).find((x) => x.joinCode === code && !x.archived);
  if (!c) return NextResponse.json({ error: "No class has that code." }, { status: 404 });
  return NextResponse.json({ code: c.joinCode, name: c.name });
}
