"use client";

import { useEffect, useRef } from "react";
import type { StudentProgress, WordList } from "@/lib/vocab/types";
import { confetti, playSound } from "./fx";
import { StreakPanel, WeekPanel } from "./Home";
import type { SessionSummary } from "./Session";

export function Results({
  summary,
  progress,
  list,
  today,
  onHome,
}: {
  summary: SessionSummary;
  progress: StudentProgress;
  list: WordList;
  today: string;
  onHome: () => void;
}) {
  const fx = useRef<HTMLCanvasElement>(null);
  const acc = summary.total ? Math.round((summary.correct / summary.total) * 100) : 0;

  useEffect(() => {
    playSound("win", progress.settings.sound);
    confetti(fx.current, 110);
    // Celebrate once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wq-app">
      <main className="wq-stage">
        <div className="wq-eyebrow">Session complete</div>
        <h1 className="wq-big-word" style={{ fontSize: 40 }}>
          {acc >= 80 ? "Brilliant work!" : acc >= 50 ? "Solid session!" : "Every session counts!"}
        </h1>
        <div className="wq-big-stats">
          <div className="wq-stat">
            <b>{summary.xp}</b>
            <span>XP earned</span>
          </div>
          <div className="wq-stat">
            <b>{summary.bestCombo}</b>
            <span>best combo</span>
          </div>
          <div className="wq-stat">
            <b>{acc}%</b>
            <span>accuracy</span>
          </div>
        </div>

        <WeekPanel progress={progress} list={list} today={today} />
        <StreakPanel progress={progress} today={today} bump />

        {summary.newlyMastered.length > 0 && (
          <div>
            <div className="wq-label">New cards collected</div>
            <div className="wq-collect">
              {summary.newlyMastered.map((w, i) => (
                <div key={w} className="wq-word-card" style={{ animationDelay: `${i * 0.2}s` }}>
                  <b>{w}</b>
                  <small>Mastered</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.newWords.length > 0 && (
          <div>
            <div className="wq-label">New words today</div>
            <div className="wq-again">
              {summary.newWords.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="wq-label">Coming back sooner</div>
          {summary.again.length ? (
            <div className="wq-again">
              {summary.again.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          ) : (
            <p className="wq-sub">Nothing missed. Your words get a longer break before they come back.</p>
          )}
        </div>
      </main>
      <footer className="wq-dock">
        <button className="wq-btn wq-btn-primary" onClick={onHome} autoFocus>
          Done
        </button>
      </footer>
      <canvas ref={fx} className="wq-fx" />
    </div>
  );
}
