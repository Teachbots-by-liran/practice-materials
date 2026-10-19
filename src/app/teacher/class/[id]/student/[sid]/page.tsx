import Link from "next/link";
import { notFound } from "next/navigation";
import { studentDetail } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";
import { dayKey } from "@/lib/vocab/dates";
import { getList } from "@/lib/vocab/lists";
import { removeStudentAction, resetPinAction, updateStudentAction } from "../../../../actions";

export const dynamic = "force-dynamic";

const STAGE_STYLE: Record<string, string> = {
  mastered: "bg-green-50 text-green-800",
  review: "bg-indigo-50 text-indigo-800",
  learning: "bg-orange-50 text-orange-800",
};

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; sid: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { id, sid } = await params;
  const { error, done } = await searchParams;
  const store = getStore();
  if (!store) return <p>Classes aren&apos;t set up.</p>;
  const today = dayKey();
  const d = await studentDetail(store, sid, today);
  if (!d || d.classRoom.id !== id) notFound();
  const { student, summary, words, progress, groups, config } = d;
  const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/teacher/class/${id}`} className="text-sm text-indigo-700 hover:underline">
          ← {d.classRoom.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{student.nickname}</h1>
        <p className="text-sm text-gray-500">
          Main list: {getList(config.mainListId)?.title}
          {config.extras.length > 0 && ` · extras: ${config.extras.map((e) => `${getList(e.listId)?.title} (${e.role})`).join(", ")}`}
        </p>
      </div>
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
      {done && <p className="text-sm text-green-800 bg-green-50 rounded-xl p-3">{done}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ["Days practised (7)", String(summary.activeDays7)],
          ["New this week", `${summary.newThisWeek} / ${summary.weeklyGoal}`],
          ["Mastered", String(summary.mastered)],
          ["Accuracy (7d)", pct(summary.accuracy7)],
          ["Rushing (7d)", pct(summary.rushing7)],
        ].map(([label, value]) => (
          <div key={label} className="section-card !p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      {summary.needsAttention.length > 0 && (
        <p className="text-sm text-orange-900 bg-orange-50 rounded-xl p-3">{summary.needsAttention.join(" · ")}</p>
      )}

      <section className="section-card">
        <h2 className="section-title">Settings for {student.nickname}</h2>
        <form action={updateStudentAction} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <input type="hidden" name="classId" value={id} />
          <input type="hidden" name="studentId" value={sid} />
          <div>
            <label className="form-label" htmlFor="groupId">
              Group
            </label>
            <select id="groupId" name="groupId" defaultValue={student.groupId ?? ""} className="form-input">
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="pace">
              Pace
            </label>
            <select id="pace" name="pace" defaultValue={student.pace ?? ""} className="form-input">
              <option value="">Same as the list</option>
              <option value="steady">Steady (fewer new words)</option>
              <option value="normal">Normal</option>
              <option value="boost">Boost (more new words)</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="weeklyGoal">
              Weekly goal
            </label>
            <input id="weeklyGoal" name="weeklyGoal" type="number" min={1} max={60} defaultValue={student.weeklyGoal ?? ""} placeholder="Same as the list" className="form-input" />
          </div>
          <button className="rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700">Save</button>
        </form>
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <form action={resetPinAction} className="flex items-end gap-2">
            <input type="hidden" name="classId" value={id} />
            <input type="hidden" name="studentId" value={sid} />
            <div>
              <label className="form-label" htmlFor="pin">
                New PIN
              </label>
              <input id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required placeholder="4 digits" className="form-input w-32" />
            </div>
            <button className="rounded-xl border border-gray-300 text-sm font-semibold px-4 py-2.5 hover:bg-gray-50">Reset PIN</button>
          </form>
          <form action={removeStudentAction}>
            <input type="hidden" name="classId" value={id} />
            <input type="hidden" name="studentId" value={sid} />
            <button className="text-sm text-red-700 hover:underline">Remove student and their progress</button>
          </form>
        </div>
      </section>

      <section className="section-card !p-0 overflow-hidden">
        <h2 className="section-title !mb-0 px-6 pt-5">Words ({words.length})</h2>
        {words.length === 0 ? (
          <p className="px-6 py-5 text-sm text-gray-500">No words started yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-semibold">Word</th>
                  <th className="px-3 py-3 font-semibold">Stage</th>
                  <th className="px-3 py-3 font-semibold">Next review</th>
                  <th className="px-3 py-3 font-semibold">Misses</th>
                  <th className="px-3 py-3 font-semibold">Hints</th>
                  <th className="px-3 py-3 font-semibold">Correct days</th>
                  <th className="px-3 py-3 font-semibold">Why it comes back then</th>
                </tr>
              </thead>
              <tbody>
                {words.map((w) => (
                  <tr key={w.word} className="border-b border-gray-50">
                    <td className="px-6 py-2 font-semibold text-gray-900">
                      {w.word}
                      {w.known && <span className="ml-2 text-xs text-gray-500">knew it</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${STAGE_STYLE[w.stage] ?? ""}`}>{w.stage}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-600">{w.due <= today ? "Today" : w.due}</td>
                    <td className="px-3 py-2 tabular-nums">{w.lapses}</td>
                    <td className="px-3 py-2 tabular-nums">{w.hints}</td>
                    <td className="px-3 py-2 tabular-nums">{w.correctDays.length} / 3</td>
                    <td className="px-3 py-2 text-gray-600">{w.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section-card">
        <h2 className="section-title">Own sentences</h2>
        {progress?.sentences.length ? (
          <ul className="space-y-2 text-sm">
            {progress.sentences
              .slice()
              .reverse()
              .map((s, i) => (
                <li key={i}>
                  <span className="font-semibold text-indigo-700">{s.word}</span> <span className="text-gray-500">· {s.date}</span>
                  <div className="text-gray-900">{s.text}</div>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">None yet. Students are offered a bonus sentence once a word is getting comfortable.</p>
        )}
      </section>
    </div>
  );
}
