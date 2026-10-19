import Link from "next/link";
import { getStore } from "@/lib/server/store";
import type { ClassRoom, Student } from "@/lib/vocab/classroom";
import { archiveClassAction, createClassAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const store = getStore();
  const classes = store ? await store.list<ClassRoom>("classes") : [];
  const students = store ? await store.list<Student>("students") : [];
  const count = (id: string) => students.filter((s) => s.classId === id).length;
  const active = classes.filter((c) => !c.archived).sort((a, b) => a.name.localeCompare(b.name));
  const archived = classes.filter((c) => c.archived);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your classes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Students join once with the class code at <b>/word-quest</b>. After that, you assign word lists from the class page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {active.map((c) => (
          <Link key={c.id} href={`/teacher/class/${c.id}`} className="section-card block hover:border-indigo-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-gray-900 text-lg">{c.name}</h2>
              <span className="font-mono text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-2 py-0.5">{c.joinCode}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {count(c.id)} {count(c.id) === 1 ? "student" : "students"}
            </p>
          </Link>
        ))}

        <form action={createClassAction} className="section-card flex flex-col gap-3">
          <label htmlFor="name" className="form-label">
            New class
          </label>
          <input id="name" name="name" required placeholder="e.g. 11-3 English (5 points)" className="form-input" maxLength={60} />
          <button className="rounded-xl bg-indigo-600 text-white font-semibold py-2 hover:bg-indigo-700">Create class</button>
        </form>
      </div>

      {archived.length > 0 && (
        <div>
          <h2 className="section-title">Archived</h2>
          <ul className="space-y-2">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center gap-3 text-sm text-gray-600">
                <Link href={`/teacher/class/${c.id}`} className="font-semibold hover:text-indigo-700">
                  {c.name}
                </Link>
                <form action={archiveClassAction}>
                  <input type="hidden" name="classId" value={c.id} />
                  <button className="text-indigo-700 hover:underline">Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
