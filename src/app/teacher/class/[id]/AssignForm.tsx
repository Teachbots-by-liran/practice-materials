"use client";

import { useState } from "react";
import type { Group } from "@/lib/vocab/classroom";

interface Props {
  action: (f: FormData) => Promise<void>;
  classId: string;
  lists: { id: string; title: string; words: number }[];
  groups: Group[];
  students: { id: string; nickname: string }[];
  today: string;
}

export function AssignForm({ action, classId, lists, groups, students, today }: Props) {
  const [who, setWho] = useState<"class" | "groups" | "students">("class");
  const [mode, setMode] = useState("main");

  return (
    <details className="rounded-xl border border-gray-200 p-4" open={false}>
      <summary className="cursor-pointer font-semibold text-indigo-700">Assign a word list</summary>
      <form action={action} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="hidden" name="classId" value={classId} />

        <div>
          <label className="form-label" htmlFor="listId">
            Word list
          </label>
          <select id="listId" name="listId" className="form-input" required>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} ({l.words} words)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor="mode">
            How it&apos;s used
          </label>
          <select id="mode" name="mode" className="form-input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="main">Main list (what the class works on)</option>
            <option value="replace">Replace the main list (e.g. a support group)</option>
            <option value="addon">Add-on: extra ⭐ words on top of the main list</option>
          </select>
        </div>

        <fieldset className="md:col-span-2">
          <legend className="form-label">Who</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["class", "Whole class"],
                ["groups", "Groups"],
                ["students", "Specific students"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="who" value={v} checked={who === v} onChange={() => setWho(v)} className="accent-indigo-600" />
                {label}
              </label>
            ))}
          </div>
          {who === "groups" &&
            (groups.length ? (
              <div className="flex flex-wrap gap-3 mt-3 text-sm">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2">
                    <input type="checkbox" name="groupIds" value={g.id} className="accent-indigo-600" />
                    {g.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No groups yet. Create one in the Groups section below.</p>
            ))}
          {who === "students" && (
            <div className="flex flex-wrap gap-3 mt-3 text-sm max-h-40 overflow-y-auto">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input type="checkbox" name="studentIds" value={s.id} className="accent-indigo-600" />
                  {s.nickname}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {mode !== "addon" && (
          <div>
            <label className="form-label" htmlFor="challengeListId">
              Challenge list (optional)
            </label>
            <select id="challengeListId" name="challengeListId" className="form-input" defaultValue="">
              <option value="">None</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Unlocks for a student once they&apos;ve mastered 70% of the main list.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="startsOn">
              Starts
            </label>
            <input id="startsOn" name="startsOn" type="date" defaultValue={today} className="form-input" />
          </div>
          <div>
            <label className="form-label" htmlFor="endsOn">
              Ends (optional)
            </label>
            <input id="endsOn" name="endsOn" type="date" className="form-input" />
          </div>
        </div>

        {mode !== "addon" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="weeklyGoal">
                New words per week
              </label>
              <input id="weeklyGoal" name="weeklyGoal" type="number" min={1} max={60} defaultValue={15} className="form-input" />
            </div>
            <div>
              <label className="form-label" htmlFor="pace">
                Pace
              </label>
              <select id="pace" name="pace" className="form-input" defaultValue="normal">
                <option value="steady">Steady (up to 3 new a day)</option>
                <option value="normal">Normal (up to 5)</option>
                <option value="boost">Boost (up to 8)</option>
              </select>
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex items-center gap-3">
          <button className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-2 hover:bg-indigo-700">Assign</button>
          <span className="text-xs text-gray-500">
            When a list ends, its words keep coming back for review. Students don&apos;t lose them.
          </span>
        </div>
      </form>
    </details>
  );
}
