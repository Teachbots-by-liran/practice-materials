"use client";

import { useState } from "react";
import { addDays, weekStart } from "@/lib/vocab/dates";
import { listStats, streak } from "@/lib/vocab/progress";
import { dueWords, MAX_REVIEWS, newWordBudget } from "@/lib/vocab/scheduler";
import type { StudentProgress, WordList } from "@/lib/vocab/types";

const C = 2 * Math.PI * 37;

export function Ring({ n, of }: { n: number; of: number }) {
  const frac = of > 0 ? Math.min(1, n / of) : 0;
  return (
    <div className="wq-ring" role="img" aria-label={`${n} of ${of}`}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle className="bg" cx="42" cy="42" r="37" />
        <circle className="fg" cx="42" cy="42" r="37" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <b>
        {n}/{of}
      </b>
    </div>
  );
}

export function WeekPanel({ progress, list, today }: { progress: StudentProgress; list: WordList; today: string }) {
  const st = listStats(progress, list, today);
  const pct = (n: number) => `${(n / Math.max(1, st.total)) * 100}%`;
  const left = Math.max(0, progress.weeklyGoal - st.newThisWeek);
  return (
    <div className="wq-panel">
      <div className="wq-pp">
        <Ring n={Math.min(st.newThisWeek, progress.weeklyGoal)} of={progress.weeklyGoal} />
        <div className="wq-pp-txt">
          <h2>Your week</h2>
          <span>
            {st.newThisWeek} of {progress.weeklyGoal} new words learned
          </span>
          <span className="wq-sub" style={{ fontSize: 13 }}>
            {left > 0 ? `${left} more to reach your weekly goal` : "Weekly goal reached 🎉"}
          </span>
        </div>
      </div>
      <div className="wq-goal-row">
        <b>{list.title}</b>
        <span>{Math.round((st.mastered / Math.max(1, st.total)) * 100)}% mastered</span>
      </div>
      <div className="wq-stack">
        <div className="m" style={{ width: pct(st.mastered) }} />
        <div className="l" style={{ width: pct(st.learning) }} />
      </div>
      <div className="wq-legend">
        <span>
          <i style={{ background: "var(--good)" }} />
          {st.mastered} mastered
        </span>
        <span>
          <i style={{ background: "var(--spark)" }} />
          {st.learning} learning
        </span>
        <span>
          <i style={{ background: "var(--sunk)" }} />
          {st.notStarted} to go
        </span>
      </div>
    </div>
  );
}

export function StreakPanel({ progress, today, bump = false }: { progress: StudentProgress; today: string; bump?: boolean }) {
  const { count, frozen } = streak(progress.activeDays, today);
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="wq-panel">
      <div className="wq-streak">
        <div className="n">{count}</div>
        <div>
          <b>{count === 1 ? "day streak" : "day streak"}{bump ? "!" : ""}</b>
          <div className="wq-week" aria-hidden="true">
            {days.map((d) => (
              <i
                key={d}
                className={`${progress.activeDays.includes(d) ? "on" : frozen.includes(d) ? "freeze" : ""} ${d === today ? "today" : ""}`}
                title={frozen.includes(d) ? "Streak freeze: one missed day a week is forgiven" : undefined}
              >
                {frozen.includes(d) ? "❄" : "SMTWTFS"[days.indexOf(d)]}
              </i>
            ))}
          </div>
        </div>
      </div>
      {bump && <span className="wq-sub">Come back tomorrow to keep it going.</span>}
    </div>
  );
}

interface Props {
  progress: StudentProgress;
  list: WordList;
  today: string;
  onStart: (extraNew?: number) => void;
  onProgress: (p: StudentProgress) => void;
  onReset: () => void;
}

export function Home({ progress, list, today, onStart, onProgress, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const due = dueWords(progress, list.id, today).length;
  const reviews = Math.min(due, MAX_REVIEWS);
  const budget = newWordBudget(progress, list, today);
  const unseen = list.words.filter((w) => !progress.words[w.word]).length;
  const hasWork = reviews > 0 || budget.count > 0;
  const minutes = Math.max(2, Math.round((reviews * 0.4 + budget.count * 1.2) + 1));
  const mastered = Object.values(progress.words).filter((s) => s.listId === list.id && s.stage === "mastered");

  let title = "Today's practice";
  let text: string;
  if (budget.reason === "catch-up") {
    title = "Catch-up day";
    text = "Let's lock in the words you've already learned. No new words today.";
  } else if (!hasWork) {
    title = "All done for today ✓";
    text = unseen > 0 ? "Your reviews are done. Come back tomorrow, or learn a few extra words now." : "You've met every word in this list. Your reviews will keep coming back.";
  } else if (budget.reason === "goal-met") {
    title = "Weekly goal reached 🎉";
    text = `Today: ${reviews} ${reviews === 1 ? "review" : "reviews"} to keep your words strong.`;
  } else if (budget.reason === "struggling") {
    text = "One new word today, and some practice on the words you've met.";
  } else {
    text = `Hi ${progress.name}! ${budget.count > 0 ? `${budget.count} new ${budget.count === 1 ? "word is" : "words are"} waiting` : "Your reviews are waiting"}${budget.count > 0 && reviews > 0 ? ", plus a few to review" : ""}.`;
  }

  return (
    <div className="wq-app">
      <main className="wq-stage">
        <div className="wq-home-head">
          <div className="wq-logo">
            Word<span>Quest</span>
          </div>
          <span className="wq-sub">{progress.xp} XP</span>
        </div>

        <WeekPanel progress={progress} list={list} today={today} />

        <div className="wq-panel wq-today">
          <h2>{title}</h2>
          <p>{text}</p>
          {hasWork && (
            <div className="wq-meta">
              {budget.count > 0 && <span>{budget.count} new</span>}
              {reviews > 0 && <span>{reviews} {reviews === 1 ? "review" : "reviews"}</span>}
              <span>Boss round</span>
              <span>~{minutes} min</span>
            </div>
          )}
        </div>

        <StreakPanel progress={progress} today={today} />

        <div className="wq-panel">
          <div className="wq-goal-row">
            <b>Your collection</b>
            <span>
              {mastered.length} {mastered.length === 1 ? "card" : "cards"}
            </span>
          </div>
          {mastered.length ? (
            <div className="wq-mini-cards">
              {mastered.map((s) => (
                <div key={s.word} className="wq-mini">
                  {s.word}
                </div>
              ))}
            </div>
          ) : (
            <span className="wq-sub">Master a word to collect its card: 3 correct days, with at least one typed.</span>
          )}
        </div>

        <div className="wq-panel">
          <label className="wq-switch" htmlFor="wq-sound">
            Sound effects
            <input
              id="wq-sound"
              type="checkbox"
              checked={progress.settings.sound}
              onChange={(e) => onProgress({ ...progress, settings: { ...progress.settings, sound: e.target.checked } })}
            />
          </label>
          {confirmReset ? (
            <div className="wq-row">
              <button className="wq-btn wq-btn-ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button className="wq-btn wq-btn-ghost" style={{ color: "var(--bad)" }} onClick={onReset}>
                Delete progress
              </button>
            </div>
          ) : (
            <button className="wq-btn-link" style={{ textAlign: "left" }} onClick={() => setConfirmReset(true)}>
              Start over on this phone…
            </button>
          )}
        </div>
      </main>
      <footer className="wq-dock">
        {hasWork ? (
          <button className="wq-btn wq-btn-primary" onClick={() => onStart()}>
            {budget.reason === "catch-up" ? "Start catch-up" : "Start practice"}
          </button>
        ) : unseen > 0 ? (
          <button className="wq-btn wq-btn-primary" onClick={() => onStart(3)}>
            Learn 3 extra words
          </button>
        ) : null}
      </footer>
    </div>
  );
}
