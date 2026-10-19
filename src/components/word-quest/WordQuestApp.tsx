"use client";

import { useEffect, useMemo, useState } from "react";
import { dayKey } from "@/lib/vocab/dates";
import { DEFAULT_LIST_ID, getList, WORD_LISTS } from "@/lib/vocab/lists";
import { clearProgress, emptyProgress, loadProgress, saveProgress } from "@/lib/vocab/progress";
import { applyPlacement, buildSession, type SessionPlan } from "@/lib/vocab/scheduler";
import type { StudentProgress, WordList } from "@/lib/vocab/types";
import { Home } from "./Home";
import { Placement } from "./Placement";
import { Results } from "./Results";
import { Session, type SessionSummary } from "./Session";

type View = "loading" | "welcome" | "placement" | "home" | "session" | "results";

/** Questions this student reported are hidden from them until the teacher checks them. */
function withoutFlagged(list: WordList, p: StudentProgress): WordList {
  const hidden = new Set(p.flags.filter((f) => f.listId === list.id).map((f) => f.questionId));
  if (!hidden.size) return list;
  return { ...list, words: list.words.map((w) => ({ ...w, questions: w.questions.filter((q) => !hidden.has(q.id)) })) };
}

export function WordQuestApp() {
  const [view, setView] = useState<View>("loading");
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [today, setToday] = useState(() => dayKey());

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setView(!p ? "welcome" : p.placementDone ? "home" : "placement");
  }, []);

  // The app may stay open overnight on a phone: pick up the new day when it comes back.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") setToday(dayKey());
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);

  const update = (p: StudentProgress) => {
    setProgress(p);
    saveProgress(p);
  };

  const list = useMemo(() => (progress ? getList(progress.listId) ?? WORD_LISTS[0] : WORD_LISTS[0]), [progress]);
  const visibleList = useMemo(() => (progress ? withoutFlagged(list, progress) : list), [list, progress]);

  if (view === "loading") return <div className="wq-app"><div className="wq-center">Loading…</div></div>;

  if (view === "welcome" || !progress) {
    return (
      <Welcome
        onStart={(name) => {
          update(emptyProgress(name, DEFAULT_LIST_ID));
          setView("placement");
        }}
      />
    );
  }

  if (view === "placement") {
    return (
      <Placement
        list={list}
        onDone={(known) => {
          update(applyPlacement(progress, list, known, today));
          setView("home");
        }}
      />
    );
  }

  if (view === "session" && plan) {
    return (
      <Session
        list={visibleList}
        progress={progress}
        plan={plan}
        onProgress={update}
        onExit={() => setView("home")}
        onFinish={(s) => {
          setSummary(s);
          setView("results");
        }}
      />
    );
  }

  if (view === "results" && summary) {
    return <Results summary={summary} progress={progress} list={list} today={today} onHome={() => setView("home")} />;
  }

  return (
    <Home
      progress={progress}
      list={list}
      today={today}
      onProgress={update}
      onReset={() => {
        clearProgress();
        setProgress(null);
        setView("welcome");
      }}
      onStart={(extraNew) => {
        const p = buildSession(visibleList, progress, today, Math.random, { extraNew });
        if (!p.items.length) return;
        setPlan(p);
        setView("session");
      }}
    />
  );
}

function Welcome({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="wq-app">
      <main className="wq-stage" style={{ justifyContent: "center" }}>
        <div className="wq-logo" style={{ fontSize: 34 }}>
          Word<span>Quest</span>
        </div>
        <h1 className="wq-prompt">Learn the words that matter for your Bagrut, a few minutes a day.</h1>
        <p className="wq-sub">Short daily sessions. Words come back right before you&apos;d forget them.</p>
        <label className="wq-label" htmlFor="wq-name" style={{ marginTop: 12 }}>
          What&apos;s your first name?
        </label>
        <input
          id="wq-name"
          className="wq-answer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          maxLength={30}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onStart(name.trim());
          }}
        />
      </main>
      <footer className="wq-dock">
        <button className="wq-btn wq-btn-primary" disabled={!name.trim()} onClick={() => onStart(name.trim())}>
          Start
        </button>
      </footer>
    </div>
  );
}
