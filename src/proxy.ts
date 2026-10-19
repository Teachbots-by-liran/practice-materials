import { NextResponse, type NextRequest } from "next/server";
import { isTeacherToken, TEACHER_COOKIE } from "@/lib/server/auth";

// Teacher-only areas: the portal, the Bagrut generator, and the routes that use the
// Claude API key. Students only ever reach /word-quest and /api/wq/*.
export function proxy(req: NextRequest) {
  if (isTeacherToken(req.cookies.get(TEACHER_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Teacher sign-in required." }, { status: 401 });
  }
  const login = new URL("/teacher/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/bagrut-generator/:path*", "/api/generate/:path*", "/teacher", "/teacher/((?!login).*)", "/api/teacher/((?!login).*)"],
};
