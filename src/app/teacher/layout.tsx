import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { isTeacherToken, TEACHER_COOKIE } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "Teacher · Word Quest" };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const signedIn = isTeacherToken((await cookies()).get(TEACHER_COOKIE)?.value);
  const store = getStore();
  return (
    <div className="min-h-screen bg-gray-50">
      <header style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/teacher" className="text-white font-bold text-lg tracking-tight">
            Word Quest <span className="text-indigo-300 font-medium">· Teacher</span>
          </Link>
          {signedIn && (
            <nav className="flex flex-wrap items-center gap-4 text-sm text-indigo-200">
              <Link href="/teacher" className="hover:text-white">
                Classes
              </Link>
              <Link href="/teacher/flags" className="hover:text-white">
                Reported questions
              </Link>
              <Link href="/bagrut-generator" className="hover:text-white">
                Bagrut generator
              </Link>
              <Link href="/word-quest" className="hover:text-white">
                Student app
              </Link>
              <SignOutButton />
            </nav>
          )}
        </div>
      </header>
      {signedIn && store?.kind === "file" && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
            Development mode: class data is saved in <code>.data/word-quest-dev.json</code> on this computer. Add the Supabase keys to use the
            real database.
          </div>
        </div>
      )}
      {signedIn && !store && (
        <div className="bg-red-50 border-b border-red-200 text-red-900 text-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
            Classes aren&apos;t set up: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the server&apos;s environment variables.
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
