import { NextRequest, NextResponse } from "next/server";
import { exportSentences } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";

// Protected by src/proxy.ts (teacher cookie).
export async function GET(req: NextRequest) {
  const store = getStore();
  if (!store) return NextResponse.json({ error: "Classes aren't set up." }, { status: 503 });
  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "Missing classId." }, { status: 400 });
  const since = req.nextUrl.searchParams.get("since") ?? undefined;
  const md = await exportSentences(store, classId, since);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-sentences-${new Date().toISOString().slice(0, 10)}.md"`,
    },
  });
}
