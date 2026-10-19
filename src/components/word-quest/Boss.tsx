"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ClozeQuestion, MeaningQuestion, WordEntry } from "@/lib/vocab/types";
import type { AnswerResult } from "./answer";
import { Marked, plain } from "./Marked";
import { useShuffled } from "./useOptions";

const SECONDS = 10;
const REVEAL_MS = 500;

export interface BossQ {
  entry: WordEntry;
  q: ClozeQuestion | MeaningQuestion;
}

interface Props {
  items: BossQ[];
  dock: (node: ReactNode) => ReactNode;
  /** Returns true when the answer counted (false when it was too fast to be real). */
  onAnswer: (item: BossQ, r: AnswerResult) => boolean;
  onFinish: (won: boolean) => void;
}

export function Boss({ items, dock, onAnswer, onFinish }: Props) {
  const [phase, setPhase] = useState<"intro" | "fight" | "end">("intro");
  const [k, setK] = useState(0);
  const [hearts, setHearts] = useState(3);

  if (phase === "intro") {
    return (
      <>
        <div className="wq-boss-hero">
          <div className="wq-eyebrow" style={{ color: "var(--spark)" }}>
            Boss round
          </div>
          <h2 className="wq-prompt">Your {items.length} trickiest words</h2>
          <p>Beat them with at least one heart left.</p>
          <div className="wq-hearts">❤️❤️❤️</div>
          <p>{SECONDS} seconds per question. Read before you tap!</p>
        </div>
        {dock(
          <button className="wq-btn wq-btn-primary" onClick={() => setPhase("fight")} autoFocus>
            Start boss round
          </button>,
        )}
      </>
    );
  }

  if (phase === "end") {
    const won = hearts > 0;
    return (
      <>
        <div className="wq-boss-hero">
          <div className="wq-eyebrow" style={{ color: "var(--spark)" }}>
            Boss round
          </div>
          <h2 className="wq-prompt">{won ? "Boss defeated!" : "The boss wins this time"}</h2>
          <p>
            {won
              ? `You finished with ${"❤️".repeat(hearts)} · +50 bonus XP`
              : "No problem. These words will come back so you can try again."}
          </p>
        </div>
        {dock(
          <button className="wq-btn wq-btn-primary" onClick={() => onFinish(won)} autoFocus>
            See results
          </button>,
        )}
      </>
    );
  }

  return (
    <BossQuestion
      key={k}
      item={items[k]}
      index={k}
      total={items.length}
      hearts={hearts}
      dock={dock}
      onAnswer={(r) => {
        const counted = onAnswer(items[k], r);
        const lost = !r.correct || !counted;
        const left = lost ? hearts - 1 : hearts;
        setHearts(left);
        setTimeout(() => {
          if (k + 1 < items.length && left > 0) setK(k + 1);
          else setPhase("end");
        }, 1300);
      }}
    />
  );
}

function BossQuestion({
  item,
  index,
  total,
  hearts,
  dock,
  onAnswer,
}: {
  item: BossQ;
  index: number;
  total: number;
  hearts: number;
  dock: (node: ReactNode) => ReactNode;
  onAnswer: (r: AnswerResult) => void;
}) {
  const { q } = item;
  const options = useShuffled(q.options, q.id);
  const [shown, setShown] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const start = useRef(0);
  const text = q.type === "meaning" ? q.prompt : q.sentence;
  const chars = plain(text).length + q.options.join(" ").length;

  useEffect(() => {
    const reveal = setTimeout(() => {
      setShown(true);
      start.current = performance.now();
    }, REVEAL_MS);
    return () => clearTimeout(reveal);
  }, []);

  const answer = (original: number | null, position?: number) => {
    if (picked !== null || timedOut) return;
    if (original === null) setTimedOut(true);
    else setPicked(original);
    onAnswer({
      correct: original === q.answer,
      hinted: false,
      ms: original === null ? SECONDS * 1000 : performance.now() - start.current,
      chars,
      choice: position,
      format: q.type,
      production: false,
      correctText: q.options[q.answer],
    });
  };
  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => answerRef.current(null), SECONDS * 1000);
    return () => clearTimeout(t);
  }, [shown]);

  const done = picked !== null || timedOut;
  return (
    <>
      <div className="wq-boss-head">
        <div className="wq-eyebrow">
          Boss · {index + 1} of {total}
        </div>
        <div className="wq-hearts" aria-label={`${hearts} hearts left`}>
          {"❤️".repeat(Math.max(0, hearts))}
          {"🤍".repeat(Math.max(0, 3 - hearts))}
        </div>
      </div>
      <div className="wq-timer">
        {shown && <i style={{ animationDuration: `${SECONDS}s`, animationPlayState: done ? "paused" : "running" }} />}
      </div>
      {q.type === "meaning" ? (
        <>
          <h2 className="wq-prompt">Which word means…</h2>
          <p className="wq-sentence">{q.prompt}</p>
        </>
      ) : (
        <p className="wq-sentence">
          <Marked text={q.sentence} />
        </p>
      )}
      {timedOut && <p className="wq-cue">Time&apos;s up!</p>}
      {dock(
        <div className="wq-opts" style={{ visibility: shown ? "visible" : "hidden" }}>
          {options.map(({ item: opt, original }, position) => {
            const state = !done ? "" : original === q.answer ? "right" : picked === original ? "wrong" : "";
            return (
              <button key={original} className={`wq-opt ${state}`} disabled={done || !shown} onClick={() => answer(original, position)}>
                {opt}
              </button>
            );
          })}
        </div>,
      )}
    </>
  );
}
