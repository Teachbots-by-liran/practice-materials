import { teacherPasswordConfigured } from "@/lib/server/auth";
import { LoginForm } from "./LoginForm";

export default async function TeacherLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/teacher";
  return (
    <div className="max-w-sm mx-auto mt-10 section-card">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Teacher sign-in</h1>
      <p className="text-sm text-gray-500 mb-5">For the Word Quest portal and the Bagrut generator.</p>
      {teacherPasswordConfigured() ? (
        <LoginForm next={safeNext} />
      ) : (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">
          No teacher password is set yet. Add <code>TEACHER_PASSWORD</code> (and <code>SESSION_SECRET</code>) to <code>.env.local</code> on
          this computer, or to the project&apos;s environment variables on Vercel, then restart.
        </p>
      )}
    </div>
  );
}
