import Link from "next/link";
import { notFound } from "next/navigation";
import { AVAILABLE_LISTS, classOverview } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";
import type { Assignment, Group } from "@/lib/vocab/classroom";
import { dayKey } from "@/lib/vocab/dates";
import { getList } from "@/lib/vocab/lists";
import {
  archiveClassAction,
  createGroupAction,
  deleteAssignmentAction,
  deleteGroupAction,
  saveAssignmentAction,
  setFocusAction,
} from "../../actions";
import { AssignForm } from "./AssignForm";

export const dynamic = "force-dynamic";

const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

function lastSeenText(iso: string | null, today: string): string {
  if (!iso) return "Never";
  const d = iso.slice(0, 10);
  if (d === today) return "Today";
  const days = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function describeTarget(a: Assignment, groups: Group[], names: Map<string, string>): string {
  if (a.target.type === "class") return "Whole class";
  if (a.target.type === "groups") return a.target.groupIds.map((g) => groups.find((x) => x.id === g)?.name ?? "deleted group").join(", ");
  return a.target.studentIds.map((s) => names.get(s) ?? "removed student").join(", ");
}

const MODE_LABEL = { main: "Main list", replace: "Replaces main list", addon: "Add-on (extra words)" };

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const store = getStore();
  if (!store) return <p>Classes aren&apos;t set up.</p>;
  const today = dayKey();
  const o = await classOverview(store, id, today);
  if (!o) notFound();
  const { classRoom, students, groups, assignments, hardest } = o;
  const names = new Map(students.map((s) => [s.id, s.nickname]));
  const active = students.filter((s) => s.activeDays7 > 0).length;
  const attention = students.filter((s) => s.needsAttention.length);
  const focusOn = classRoom.focusUntil && today <= classRoom.focusUntil ? classRoom.focusWords : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/teacher" className="text-sm text-indigo-700 hover:underline">
            ← Classes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {classRoom.name} {classRoom.archived && <span className="text-sm font-medium text-gray-500">(archived)</span>}
          </h1>
        </div>
        <div className="section-card !p-4 text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class code</div>
          <div className="font-mono text-3xl font-bold text-indigo-700 tracking-wider">{classRoom.joinCode}</div>
          <div className="text-xs text-gray-500">Students open /word-quest and tap “Join my class”</div>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Practised this week" value={`${active} / ${students.length}`} />
        <Stat label="Words mastered (average)" value={students.length ? String(Math.round(students.reduce((n, s) => n + s.mastered, 0) / students.length)) : "–"} />
        <Stat label="Reported questions" value={String(o.openFlags)} href={o.openFlags ? "/teacher/flags" : undefined} />
        <Stat label="Students' own sentences" value={String(o.sentences)} href={o.sentences ? `/api/teacher/export?classId=${classRoom.id}` : undefined} hint={o.sentences ? "Download for Claude" : undefined} />
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <section className="section-card">
          <h2 className="section-title">Needs attention</h2>
          <ul className="space-y-1.5 text-sm">
            {attention.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/class/${classRoom.id}/student/${s.id}`} className="font-semibold text-gray-900 hover:text-indigo-700">
                  {s.nickname}
                </Link>
                <span className="text-gray-600"> · {s.needsAttention.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Students */}
      <section className="section-card !p-0 overflow-hidden">
        <h2 className="section-title !mb-0 px-6 pt-5">Students</h2>
        {students.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-500">No students yet. Share the class code above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Group</th>
                  <th className="px-3 py-3 font-semibold">Last practice</th>
                  <th className="px-3 py-3 font-semibold">Days (7)</th>
                  <th className="px-3 py-3 font-semibold">New this week</th>
                  <th className="px-3 py-3 font-semibold">Mastered</th>
                  <th className="px-3 py-3 font-semibold">Accuracy (7d)</th>
                  <th className="px-3 py-3 font-semibold" title="Answers too fast to have been read">
                    Rushing
                  </th>
                  <th className="px-3 py-3 font-semibold">Streak</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-indigo-50/40">
                    <td className="px-6 py-2.5">
                      <Link href={`/teacher/class/${classRoom.id}/student/${s.id}`} className="font-semibold text-gray-900 hover:text-indigo-700">
                        {s.nickname}
                      </Link>
                      {s.pace && <span className="ml-2 text-xs text-indigo-700 bg-indigo-50 rounded px-1.5">{s.pace}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{groups.find((g) => g.id === s.groupId)?.name ?? "–"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{lastSeenText(s.lastSeen, today)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{s.activeDays7}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {s.newThisWeek} / {s.weeklyGoal}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{s.mastered}</td>
                    <td className="px-3 py-2.5 tabular-nums">{pct(s.accuracy7)}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className={s.rushing7 !== null && s.rushing7 >= 0.2 ? "text-red-700 font-semibold bg-red-50 rounded px-1.5" : ""}>
                        {pct(s.rushing7)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{s.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Hardest words */}
      <section className="section-card">
        <h2 className="section-title">The class&apos;s hardest words</h2>
        {hardest.length === 0 ? (
          <p className="text-sm text-gray-500">Not enough answers yet. This fills in once a few students have practised.</p>
        ) : (
          <form action={setFocusAction} className="space-y-3">
            <input type="hidden" name="classId" value={classRoom.id} />
            <ul className="space-y-2">
              {hardest.map((w) => (
                <li key={w.word} className="flex items-center gap-3 text-sm">
                  <input type="checkbox" name="words" value={w.word} defaultChecked={focusOn.includes(w.word)} className="h-4 w-4 accent-indigo-600" />
                  <span className="w-32 font-semibold text-gray-900">{w.word}</span>
                  <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden max-w-xs">
                    <span className="block h-full bg-orange-500" style={{ width: `${Math.round(w.errorRate * 100)}%` }} />
                  </span>
                  <span className="text-gray-600 tabular-nums w-40">
                    {Math.round(w.errorRate * 100)}% wrong · {w.students} students
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2 hover:bg-indigo-700">
                Put checked words in everyone&apos;s boss round for a week
              </button>
              {focusOn.length > 0 && (
                <span className="text-sm text-gray-600">
                  Now in the boss round until {classRoom.focusUntil}: {focusOn.join(", ")}
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Assignments */}
      <section id="assign" className="section-card space-y-5">
        <h2 className="section-title !mb-0">Word lists</h2>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing assigned yet, so students practise the default list ({getList(AVAILABLE_LISTS[0].id)?.title}).
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {assignments.map((a) => (
              <li key={a.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-gray-900">{getList(a.listId)?.title ?? a.listId}</span>
                <span className="text-gray-600">{MODE_LABEL[a.mode]}</span>
                <span className="text-gray-600">{describeTarget(a, groups, names)}</span>
                <span className="text-gray-600">
                  {a.startsOn} → {a.endsOn ?? "no end"}
                </span>
                <span className="text-gray-600">
                  {a.weeklyGoal}/week · {a.pace}
                </span>
                {a.challengeListId && <span className="text-indigo-700">⭐ challenge: {getList(a.challengeListId)?.title}</span>}
                <form action={deleteAssignmentAction} className="ml-auto">
                  <input type="hidden" name="classId" value={classRoom.id} />
                  <input type="hidden" name="assignmentId" value={a.id} />
                  <button className="text-red-700 hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <AssignForm
          action={saveAssignmentAction}
          classId={classRoom.id}
          lists={AVAILABLE_LISTS}
          groups={groups}
          students={students.map((s) => ({ id: s.id, nickname: s.nickname }))}
          today={today}
        />
      </section>

      {/* Groups */}
      <section className="section-card space-y-4">
        <h2 className="section-title !mb-0">Groups</h2>
        <p className="text-sm text-gray-500">
          Groups let you give some students a different or extra list. Students never see group names. Put a student in a group from
          their page.
        </p>
        <ul className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-sm">
              <span className="font-semibold">{g.name}</span>
              <span className="text-gray-500">{students.filter((s) => s.groupId === g.id).length}</span>
              <form action={deleteGroupAction}>
                <input type="hidden" name="classId" value={classRoom.id} />
                <input type="hidden" name="groupId" value={g.id} />
                <button className="text-gray-400 hover:text-red-700" aria-label={`Delete group ${g.name}`}>
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createGroupAction} className="flex gap-2 max-w-sm">
          <input type="hidden" name="classId" value={classRoom.id} />
          <input name="name" required placeholder="e.g. Challenge" className="form-input" maxLength={40} />
          <button className="rounded-xl bg-gray-900 text-white text-sm font-semibold px-4 hover:bg-gray-700">Add</button>
        </form>
      </section>

      <form action={archiveClassAction}>
        <input type="hidden" name="classId" value={classRoom.id} />
        <button className="text-sm text-gray-500 hover:text-red-700">
          {classRoom.archived ? "Restore this class" : "Archive this class (end of year)"}
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value, href, hint }: { label: string; value: string; href?: string; hint?: string }) {
  const body = (
    <>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-indigo-700 mt-0.5">{hint} →</div>}
    </>
  );
  return href ? (
    <a href={href} className="section-card !p-4 block hover:border-indigo-300">
      {body}
    </a>
  ) : (
    <div className="section-card !p-4">{body}</div>
  );
}
