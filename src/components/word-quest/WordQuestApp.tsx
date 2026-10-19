"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudyConfig } from "@/lib/vocab/classroom";
import { dayKey } from "@/lib/vocab/dates";
import { DEFAULT_LIST_ID } from "@/lib/vocab/lists";
import { mergeProgress } from "@/lib/vocab/merge";
import { clearProgress, emptyProgress, loadProgress, saveProgress } from "@/lib/vocab/progress";
import { applyPlacement, buildSession, type SessionPlan } from "@/lib/vocab/scheduler";
import { localConfig, needsPlacement, studyLists, withConfig } from "@/lib/vocab/study";
import type { StudentProgress } from "@/lib/vocab/types";
import {
  classesAvailable,
  fetchMe,
  loadCachedConfig,
  loadSession,
  pushProgress,
  saveCachedConfig,
  saveSession,
  type CloudSession,
} from "./cloud";
import { Home } from "./Home";
import { Placement } from "./Placement";
import { Results } from "./Results";
import { Session, type SessionSummary } from "./Session";
import { JoinForm, Welcome } from "./Welcome";

type View = "loading" | "welcome" | "join" | "placement" | "home" | "session" | "results";

const SYNC_DELAY_MS = 4000;

export function WordQuestApp() {
  const [view, setView] = useState<View>("loading");
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [canJoin, setCanJoin] = useState(false);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [today, setToday] = useState(() => dayKey());
  const [offline, setOffline] = useState(false);

  const progressRef = useRef<StudentProgress | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(async (keepalive = false) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    const s = loadSession();
    const p = progressRef.current;
    if (!s || !p) return;
    const merged = await pushProgress(s.token, p, keepalive);
    setOffline(!merged);
    if (merged && !keepalive) {
      // Keep anything answered while the request was in flight.
      const latest = progressRef.current ? mergeProgress(progressRef.current, merged) : merged;
      progressRef.current = latest;
      setProgress(latest);
      saveProgress(latest);
    }
  }, []);

  const update = useCallback(
    (p: StudentProgress) => {
      progressRef.current = p;
      setProgress(p);
      saveProgress(p);
      if (loadSession()) {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => sync(), SYNC_DELAY_MS);
      }
    },
    [sync],
  );

  /** Loads the class setup and server progress, merging with what's on this phone. */
  const connect = useCallback(
    async (s: CloudSession, local: StudentProgress | null) => {
      const me = await fetchMe(s.token, dayKey());
      if (me.status === "signed-out") {
        saveSession(null);
        setSession(null);
        return null;
      }
      if (me.status === "offline") {
        setOffline(true);
        return local;
      }
      setOffline(false);
      setConfig(me.config);
      saveCachedConfig(me.config);
      const base = local ?? emptyProgress(s.nickname, me.config.mainListId);
      const merged = withConfig(me.progress ? mergeProgress(base, me.progress) : base, me.config);
      return { ...merged, name: s.nickname };
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const local = loadProgress();
      const s = loadSession();
      setSession(s);
      setConfig(loadCachedConfig());
      setCanJoin(await classesAvailable());
      let p = local;
      if (s) p = (await connect(s, local)) ?? (loadSession() ? local : null);
      if (p) {
        progressRef.current = p;
        setProgress(p);
        saveProgress(p);
        if (loadSession()) sync();
      }
      setView(p ? "home" : "welcome");
    })();
  }, [connect, sync]);

  // Phones keep tabs open for days: pick up the new date and fresh class setup on return,
  // and save progress when the student switches away.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setToday(dayKey());
        const s = loadSession();
        if (s && progressRef.current) connect(s, progressRef.current).then((p) => p && update(p));
      } else if (syncTimer.current) {
        sync(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [connect, sync, update]);

  const effectiveConfig = useMemo(() => (progress ? config ?? localConfig(progress) : null), [config, progress]);
  const lists = useMemo(() => (progress && effectiveConfig ? studyLists(effectiveConfig, progress) : null), [effectiveConfig, progress]);

  // Nothing new to check in this list (every word already started): skip its placement.
  useEffect(() => {
    if (!progress || !lists || !needsPlacement(progress, lists.main.id)) return;
    if (lists.main.words.every((w) => progress.words[w.word])) update(applyPlacement(progress, lists.main, [], today));
  }, [progress, lists, today, update]);

  if (view === "loading") {
    return (
      <div className="wq-app">
        <div className="wq-center">Loading…</div>
      </div>
    );
  }

  if (view === "join") {
    return (
      <JoinForm
        onCancel={() => setView(progress ? "home" : "welcome")}
        onJoined={async (s) => {
          saveSession(s);
          setSession(s);
          const p = await connect(s, progressRef.current);
          if (p) update(p);
          sync();
          setView("home");
        }}
      />
    );
  }

  if (view === "welcome" || !progress || !lists || !effectiveConfig) {
    return (
      <Welcome
        canJoin={canJoin}
        onJoin={() => setView("join")}
        onSolo={(name) => {
          update(emptyProgress(name, DEFAULT_LIST_ID));
          setView("home");
        }}
      />
    );
  }

  // A placement check for each new main list, so known words get harder questions.
  if (needsPlacement(progress, lists.main.id) && view !== "session" && view !== "results") {
    const unseen = { ...lists.main, words: lists.main.words.filter((w) => !progress.words[w.word]) };
    if (unseen.words.length) {
      return <Placement list={unseen} onDone={(known) => update(applyPlacement(progress, lists.main, known, today))} />;
    }
  }

  if (view === "session" && plan) {
    return (
      <Session
        list={lists.combined}
        sourceOf={lists.sourceOf}
        progress={progress}
        plan={plan}
        onProgress={update}
        onExit={() => {
          sync();
          setView("home");
        }}
        onFinish={(s) => {
          setSummary(s);
          setView("results");
          setTimeout(() => sync(), 0);
        }}
      />
    );
  }

  if (view === "results" && summary) {
    return <Results summary={summary} progress={progress} list={lists.main} today={today} onHome={() => setView("home")} />;
  }

  return (
    <Home
      progress={progress}
      lists={lists}
      config={effectiveConfig}
      session={session}
      offline={offline}
      canJoin={canJoin}
      today={today}
      onProgress={update}
      onJoin={() => setView("join")}
      onSignOut={() => {
        saveSession(null);
        saveCachedConfig(null);
        clearProgress();
        setSession(null);
        setConfig(null);
        setProgress(null);
        progressRef.current = null;
        setView("welcome");
      }}
      onStart={(extraNew) => {
        const p = buildSession(lists.main, progress, today, Math.random, {
          extraNew,
          extras: lists.extras.map((e) => e.list),
          reviewOnly: lists.reviewOnly,
          focus: effectiveConfig.focus,
        });
        if (!p.items.length) return;
        setPlan(p);
        setView("session");
      }}
    />
  );
}
