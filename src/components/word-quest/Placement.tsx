"use client";

import { useMemo, useRef, useState } from "react";
import { GuessMonitor } from "@/lib/vocab/guessing";
import { placementItems } from "@/lib/vocab/scheduler";
import type { ClozeQuestion, MeaningQuestion, WordList } from "@/lib/vocab/types";
import { Marked, plain } from "./Marked";
import { useLockAndTimer, useShuffled } from "./useOptions";

/**
 * Quick check of which words the student already knows. Known words aren't skipped:
 * they get harder questions. There's an "I don't know" button so nobody has to guess.
 */
export function Placement({ list, onDone }: { list: WordList; onDone: (known: string[]) => void }) {
  const items = useMemo(() => {
    const qs = new Map(list.words.flatMap((w) => w.questions.map((q) => [q.id, q] as const)));
    return placementItems(list, Math.random).map((i) => ({ ...i, q: qs.get(i.qid) as ClozeQuestion | MeaningQuestion }));
  }, [list]);
  const [phase, setPhase] = useState<"intro" | "check" | "done">("intro");
  const [k, setK] = useState(0);
  const known = useRef<string[]>([]);
  const monitor = useRef(new GuessMonitor());
  const [warning, setWarning] = useState<string | null>(null);

  if (phase === "intro") {
    return (
      <div className="wq-app">
        <main className="wq-stage">
          <div className="wq-eyebrow">Before we start</div>
          <h1 className="wq-prompt">Quick check: which words do you already know?</h1>
          <p className="wq-sub">
            {items.length} quick questions, about 2 minutes. If you don&apos;t know a word, tap “I don&apos;t know”. That&apos;s
            what it&apos;s for, and it helps the app pick the right practice for you.
          </p>
          <p className="wq-sub">Words you already know won&apos;t be skipped. You&apos;ll get harder questions for them.</p>
        </main>
        <footer className="wq-dock">
          <button className="wq-btn wq-btn-primary" onClick={() => setPhase("check")}>
            Start the check
          </button>
          <button className="wq-btn wq-btn-link" onClick={() => onDone([])}>
            Skip, all these words are new to me
          </button>
        </footer>
      </div>
    );
  }

  if (phase === "done") {
    const n = known.current.length;
    return (
      <div className="wq-app">
        <main className="wq-stage">
          <div className="wq-eyebrow">Check complete</div>
          <h1 className="wq-prompt">
            {n === 0 ? "Everything here is new for you. Perfect, let's learn them!" : `You already know ${n} of ${items.length} words.`}
          </h1>
          {n > 0 && <p className="wq-sub">You&apos;ll still practise them, with harder questions, so they stay strong.</p>}
        </main>
        <footer className="wq-dock">
          <button className="wq-btn wq-btn-primary" onClick={() => onDone(known.current)} autoFocus>
            Let&apos;s go
          </button>
        </footer>
      </div>
    );
  }

  const item = items[k];
  const next = (isKnown: boolean) => {
    if (isKnown) known.current.push(item.word);
    if (k + 1 < items.length) setK(k + 1);
    else setPhase("done");
  };

  return (
    <div className="wq-app">
      <header className="wq-top">
        <span />
        <div className="wq-track" role="progressbar" aria-valuenow={k} aria-valuemax={items.length}>
          <div className="wq-fill" style={{ width: `${(k / items.length) * 100}%` }} />
        </div>
        <span className="wq-sub" style={{ fontSize: 14 }}>
          {k + 1}/{items.length}
        </span>
      </header>
      <PlacementQuestion
        key={k}
        q={item.q}
        warning={warning}
        onAnswer={(correct, ms, chars, choice) => {
          const v = monitor.current.record({ ms, chars, correct, choice });
          setWarning(v.tooFast ? "Too fast to count. Take a second to read each one 🙂" : null);
          next(correct && !v.tooFast);
        }}
        onDontKnow={() => {
          setWarning(null);
          next(false);
        }}
      />
    </div>
  );
}

function PlacementQuestion({
  q,
  warning,
  onAnswer,
  onDontKnow,
}: {
  q: ClozeQuestion | MeaningQuestion;
  warning: string | null;
  onAnswer: (correct: boolean, ms: number, chars: number, choice: number) => void;
  onDontKnow: () => void;
}) {
  const options = useShuffled(q.options, q.id);
  const { elapsed } = useLockAndTimer(0);
  const chars = plain(q.type === "meaning" ? q.prompt : q.sentence).length + q.options.join(" ").length;
  return (
    <>
      <main className="wq-stage">
        {warning && <div className="wq-note-box">{warning}</div>}
        {q.type === "meaning" ? (
          <>
            <h2 className="wq-prompt">Which word means…</h2>
            <p className="wq-sentence">{q.prompt}</p>
          </>
        ) : (
          <>
            <h2 className="wq-prompt">Which word fits?</h2>
            <p className="wq-sentence">
              <Marked text={q.sentence} />
            </p>
          </>
        )}
      </main>
      <footer className="wq-dock">
        <div className="wq-opts">
          {options.map(({ item, original }, shown) => (
            <button key={original} className="wq-opt" onClick={() => onAnswer(original === q.answer, elapsed(), chars, shown)}>
              {item}
            </button>
          ))}
          <button className="wq-btn wq-btn-link" onClick={onDontKnow}>
            I don&apos;t know
          </button>
        </div>
      </footer>
    </>
  );
}
