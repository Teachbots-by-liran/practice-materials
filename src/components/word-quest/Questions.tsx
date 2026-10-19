"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { gradeTyped, normalize } from "@/lib/vocab/grading";
import { formsOf } from "@/lib/vocab/validate";
import type {
  ChatQuestion,
  ClozeQuestion,
  FamilyQuestion,
  MeaningQuestion,
  PickQuestion,
  SwipeQuestion,
  WordEntry,
} from "@/lib/vocab/types";
import type { AnswerResult } from "./answer";
import { speak } from "./fx";
import { Boxes, Marked, plain } from "./Marked";
import { useLockAndTimer, useShuffled } from "./useOptions";

type Dock = (node: ReactNode) => ReactNode;

/** Every question screen renders its body plus whatever goes in the bottom dock. */
interface Base {
  entry: WordEntry;
  lockMs: number;
  onAnswer: (r: AnswerResult) => void;
  /** Header row (eyebrow + flag button), supplied by the session. */
  head: (label: string) => ReactNode;
  dock: Dock;
}

function LockNote({ locked }: { locked: boolean }) {
  return locked ? <p className="wq-lock-note">Read it first… answers unlock in a moment</p> : null;
}

// ── Meet ───────────────────────────────────────────────────────────

export function MeetScreen({ entry, onDone, dock }: { entry: WordEntry; onDone: (guessedRight: boolean) => void; dock: Dock }) {
  const [phase, setPhase] = useState<"guess" | "learn">("guess");
  const [picked, setPicked] = useState<number | null>(null);
  const options = useShuffled(entry.meet.options, entry.word);
  const guessedRight = picked === entry.meet.answer;
  const markedWord = entry.meet.sentence.match(/\{([^}]+)\}/)?.[1] ?? entry.word;

  if (phase === "guess") {
    return (
      <>
        <div className="wq-eyebrow">New word · guess first</div>
        <div className="wq-word-row">
          <h1 className="wq-big-word">{entry.word}</h1>
          <span className="wq-pos">{entry.pos}</span>
        </div>
        <p className="wq-sentence">
          <Marked text={entry.meet.sentence} />
        </p>
        <h2 className="wq-prompt">What do you think “{markedWord}” means here?</h2>
        {dock(
          <div className="wq-opts">
            {options.map(({ item, original }) => (
              <button
                key={original}
                className={`wq-opt ${picked !== null && original === entry.meet.answer ? "right" : ""} ${picked === original && original !== entry.meet.answer ? "picked" : ""}`}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(original);
                  setTimeout(() => setPhase("learn"), 800);
                }}
              >
                {item}
              </button>
            ))}
          </div>,
        )}
      </>
    );
  }

  return (
    <>
      <div className="wq-eyebrow">{guessedRight ? "Good guess!" : "Nice try. Guessing still helps you remember."}</div>
      <div className="wq-word-row">
        <h1 className="wq-big-word">{entry.word}</h1>
        <span className="wq-pos">{entry.pos}</span>
        {typeof window !== "undefined" && "speechSynthesis" in window && (
          <button className="wq-speak" onClick={() => speak(entry.word)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />
            </svg>
            Hear it
          </button>
        )}
      </div>
      <div className="wq-learn">
        <div>
          <div className="wq-label">Meaning</div>
          <p className="wq-def">{entry.definition}</p>
        </div>
        <div>
          <div className="wq-label">בעברית</div>
          <div className="wq-he" dir="rtl" lang="he">
            {entry.he}
          </div>
        </div>
        {entry.family.length > 0 && (
          <div>
            <div className="wq-label">Word family</div>
            <div className="wq-family">
              {[{ form: entry.word, pos: entry.pos }, ...entry.family].map((f, k) => (
                <span key={f.form} className={`wq-chip ${k === 0 ? "here" : ""}`}>
                  {f.form}
                  <small>{f.pos}</small>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {dock(
        <button className="wq-btn wq-btn-primary" onClick={() => onDone(guessedRight)} autoFocus>
          Got it
        </button>,
      )}
    </>
  );
}

// ── Multiple choice: meaning and cloze ─────────────────────────────

export function ChoiceScreen({ q, lockMs, onAnswer, head, dock, boss }: Base & { q: MeaningQuestion | ClozeQuestion; boss?: boolean }) {
  const options = useShuffled(q.options, q.id);
  const [picked, setPicked] = useState<number | null>(null);
  const { locked, elapsed } = useLockAndTimer(lockMs);
  const text = q.type === "meaning" ? q.prompt : q.sentence;
  const chars = plain(text).length + q.options.join(" ").length;

  const choose = (original: number, shown: number) => {
    if (picked !== null) return;
    setPicked(original);
    onAnswer({
      correct: original === q.answer,
      hinted: false,
      ms: elapsed(),
      chars,
      choice: shown,
      format: q.type,
      production: false,
      correctText: q.options[q.answer],
      explain: q.type === "cloze" ? q.explain : undefined,
    });
  };

  return (
    <>
      {!boss && head(q.type === "meaning" ? "Quick check" : "Fill the gap")}
      {q.type === "meaning" ? (
        <>
          <h2 className="wq-prompt">Which word means…</h2>
          <p className="wq-sentence">{q.prompt}</p>
        </>
      ) : (
        <>
          {!boss && <h2 className="wq-prompt">Which word fits?</h2>}
          <p className="wq-sentence">
            <Marked text={q.sentence} />
          </p>
        </>
      )}
      {dock(
        <>
          <LockNote locked={locked} />
          <div className={`wq-opts ${locked ? "locked" : ""}`}>
            {options.map(({ item, original }, shown) => {
              const state =
                picked === null ? "" : original === q.answer ? "right" : picked === original ? "wrong" : "";
              return (
                <button key={original} className={`wq-opt ${state}`} disabled={locked || picked !== null} onClick={() => choose(original, shown)}>
                  {item}
                </button>
              );
            })}
          </div>
        </>,
      )}
    </>
  );
}

// ── Swipe ──────────────────────────────────────────────────────────

export function SwipeScreen({ q, lockMs, onAnswer, head, dock }: Base & { q: SwipeQuestion }) {
  const card = useRef<HTMLDivElement>(null);
  const yes = useRef<HTMLSpanElement>(null);
  const no = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x0: number | null; dx: number }>({ x0: null, dx: 0 });
  const [done, setDone] = useState(false);
  const { locked, elapsed } = useLockAndTimer(lockMs);

  const decide = (saysCorrect: boolean) => {
    if (done || locked) return;
    setDone(true);
    const el = card.current;
    if (el) {
      el.classList.add("fly");
      el.style.transform = `translateX(${saysCorrect ? 140 : -140}%) rotate(${saysCorrect ? 18 : -18}deg)`;
      el.style.opacity = "0";
    }
    onAnswer({
      correct: saysCorrect === q.correct,
      hinted: false,
      ms: elapsed(),
      chars: plain(q.sentence).length,
      format: "swipe",
      production: false,
      correctText: q.correct ? "This use is correct." : "This use is wrong.",
      explain: q.explain,
    });
  };

  const setStamps = (dx: number) => {
    if (yes.current) yes.current.style.opacity = String(Math.max(0, dx / 90));
    if (no.current) no.current.style.opacity = String(Math.max(0, -dx / 90));
  };

  return (
    <>
      {head("Swipe")}
      <h2 className="wq-prompt">Is the word used correctly?</h2>
      <p className="wq-sub">Swipe right for yes, left for no.</p>
      <div className="wq-deck">
        <div
          ref={card}
          className="wq-card"
          onPointerDown={(e) => {
            if (done || locked) return;
            drag.current.x0 = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.classList.remove("fly");
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d.x0 === null) return;
            d.dx = e.clientX - d.x0;
            e.currentTarget.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 18}deg)`;
            setStamps(d.dx);
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (d.x0 === null) return;
            d.x0 = null;
            if (Math.abs(d.dx) > 90) decide(d.dx > 0);
            else {
              e.currentTarget.classList.add("fly");
              e.currentTarget.style.transform = "";
              setStamps(0);
            }
            d.dx = 0;
          }}
        >
          <span ref={yes} className="wq-stamp yes">YES</span>
          <span ref={no} className="wq-stamp no">NO</span>
          <div>
            <Marked text={q.sentence} />
          </div>
        </div>
      </div>
      {dock(
        <>
          <LockNote locked={locked} />
          <div className="wq-row">
            <button className="wq-btn wq-btn-ghost" style={{ color: "var(--bad)" }} disabled={done || locked} onClick={() => decide(false)}>
              ✕ Wrong use
            </button>
            <button className="wq-btn wq-btn-ghost" style={{ color: "var(--good)" }} disabled={done || locked} onClick={() => decide(true)}>
              ✓ Correct
            </button>
          </div>
        </>,
      )}
    </>
  );
}

// ── Produce: chat reply or word family, typed or with letter tiles ─

const DECOY_LETTERS = "aeioulnrst";

export function ProduceScreen({
  entry,
  q,
  mode,
  showCue,
  realWords,
  onAnswer,
  head,
  dock,
}: Base & { q: ChatQuestion | FamilyQuestion; mode: "typed" | "tiles"; showCue: boolean; realWords: string[] }) {
  const answer = q.answer.toLowerCase();
  const [typed, setTyped] = useState("");
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const [hinted, setHinted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<"ok" | "no" | null>(null);
  const triedAlso = useRef(false);
  const { elapsed } = useLockAndTimer(0);
  const tiles = useMemo(() => {
    const letters = [...answer.replace(/[^a-z]/g, "")];
    for (let i = 0; i < 2; i++) letters.push(DECOY_LETTERS[Math.floor(Math.random() * DECOY_LETTERS.length)]);
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters;
  }, [answer]);

  const finish = (given: string) => {
    const alsoFits = q.type === "chat" ? (q.alsoFits ?? []).map(normalize) : [];
    if (!triedAlso.current && alsoFits.includes(normalize(given))) {
      triedAlso.current = true;
      setNote(`Good English! “${given.trim()}” fits too, but we're practising a different word. Try again.`);
      setTyped("");
      setUsedTiles([]);
      return;
    }
    const grade = gradeTyped(given, answer, realWords);
    setResult(grade === "wrong" ? "no" : "ok");
    onAnswer({
      correct: grade !== "wrong",
      typo: grade === "typo",
      hinted,
      ms: elapsed(),
      chars: 0,
      format: mode,
      production: true,
      correctText: q.answer,
      explain: grade === "typo" ? `Small spelling slip, counted correct. It's spelled “${q.answer}”.` : undefined,
    });
  };

  const tapTile = (i: number) => {
    if (result || usedTiles.includes(i)) return;
    const next = typed + tiles[i];
    setUsedTiles([...usedTiles, i]);
    setTyped(next);
    if (next.length === answer.length) finish(next);
  };
  const backspace = () => {
    if (result || !usedTiles.length) return;
    setUsedTiles(usedTiles.slice(0, -1));
    setTyped(typed.slice(0, -1));
  };

  const boxes = <Boxes answer={answer} typed={typed.toLowerCase()} ghostFirst={showCue} />;
  const hintBody =
    q.type === "family" ? (
      <span>{q.hint}</span>
    ) : (
      <>
        <span className="wq-he" dir="rtl" lang="he" style={{ background: "none", padding: 0 }}>
          {entry.he}
        </span>
        {!showCue && (
          <span>
            Starts with <b>{answer[0]}</b>
          </span>
        )}
      </>
    );

  return (
    <>
      {head(q.type === "family" ? "Word family" : showCue ? "Recall" : "Recall · from memory")}
      {q.type === "chat" ? (
        <>
          <h2 className="wq-prompt">Finish your reply to {q.who}</h2>
          <div className="wq-chat">
            <div className="wq-msg them">
              <span className="who">{q.who}</span>
              {q.them}
            </div>
            <div className="wq-msg me">
              <Marked text={q.me} gap={boxes} />
            </div>
          </div>
          {showCue && (
            <p className="wq-cue">
              Meaning: <b>{entry.definition}</b>
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="wq-prompt">
            Complete with the right form of <mark>{entry.word}</mark>
          </h2>
          <p className="wq-sentence">
            <Marked text={q.sentence} gap={boxes} />
          </p>
        </>
      )}
      {note && <div className="wq-note-box">{note}</div>}
      {hinted && <div className="wq-hint-box">{hintBody}</div>}

      {mode === "typed" ? (
        <>
          <input
            className={`wq-answer ${result ?? ""}`}
            type="text"
            value={typed}
            placeholder={showCue ? `Starts with “${answer[0]}”…` : "Type the word"}
            maxLength={answer.length + 4}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="Your answer"
            disabled={!!result}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && typed.trim()) finish(typed);
            }}
            onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
          />
          {/[֐-׿]/.test(typed) && <p className="wq-cue">Your keyboard is set to Hebrew. Switch it to English to answer.</p>}
          <div className="wq-row">
            <button className="wq-btn wq-btn-ghost" disabled={hinted || !!result} onClick={() => setHinted(true)}>
              💡 Hint
            </button>
            <button className="wq-btn wq-btn-primary" disabled={!typed.trim() || !!result} onClick={() => finish(typed)}>
              Check
            </button>
          </div>
        </>
      ) : (
        dock(
          <>
            <div className="wq-tiles">
              {tiles.map((t, i) => (
                <button key={i} className={`wq-tile ${usedTiles.includes(i) ? "used" : ""}`} onClick={() => tapTile(i)} aria-label={t}>
                  {t}
                </button>
              ))}
            </div>
            <div className="wq-row">
              <button className="wq-btn wq-btn-ghost" disabled={hinted || !!result} onClick={() => setHinted(true)}>
                💡 Hint
              </button>
              <button className="wq-btn wq-btn-ghost" disabled={!usedTiles.length || !!result} onClick={backspace} aria-label="Delete last letter">
                ⌫ Undo
              </button>
            </div>
          </>,
        )
      )}
    </>
  );
}

// ── Pick all that fit ──────────────────────────────────────────────

export function PickScreen({ entry, q, lockMs, onAnswer, head, dock }: Base & { q: PickQuestion }) {
  const options = useShuffled(q.options, q.id);
  const [sel, setSel] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const { locked, elapsed } = useLockAndTimer(lockMs);

  const check = () => {
    setChecked(true);
    const correct = q.options.every((o, i) => o.correct === sel.includes(i));
    onAnswer({
      correct,
      hinted: false,
      ms: elapsed(),
      chars: q.options.map((o) => plain(o.text)).join(" ").length,
      format: "pick",
      production: false,
      correctText: q.options.filter((o) => o.correct).map((o) => `• ${plain(o.text)}`).join("\n"),
      explain: q.explain,
    });
  };

  return (
    <>
      {head("Pick all that fit")}
      <h2 className="wq-prompt">
        Which sentences use <mark>{entry.word}</mark> correctly?
      </h2>
      <p className="wq-sub">Choose all the correct ones.</p>
      <div className="wq-opts">
        {options.map(({ item, original }) => {
          const on = sel.includes(original);
          let state = on ? "picked" : "";
          if (checked) state = item.correct ? (on ? "right" : "missed") : on ? "wrong" : "";
          return (
            <button
              key={original}
              className={`wq-opt wq-check ${state}`}
              disabled={checked || locked}
              aria-pressed={on}
              onClick={() => setSel(on ? sel.filter((i) => i !== original) : [...sel, original])}
            >
              <span className="box">{on ? "✓" : ""}</span>
              <span>
                <Marked text={item.text} />
              </span>
            </button>
          );
        })}
      </div>
      {dock(
        <>
          <LockNote locked={locked} />
          <button className="wq-btn wq-btn-primary" disabled={!sel.length || checked || locked} onClick={check}>
            Check
          </button>
        </>,
      )}
    </>
  );
}

// ── Word bank ──────────────────────────────────────────────────────

export interface BankLine {
  entry: WordEntry;
  q: ChatQuestion;
}

export function BankScreen({
  lines,
  distractors,
  onDone,
  dock,
}: {
  lines: BankLine[];
  distractors: string[];
  onDone: (results: { word: string; qid: string; correct: boolean }[], ms: number) => void;
  dock: Dock;
}) {
  const chips = useShuffled([...lines.map((l) => l.q.answer), ...distractors], lines.map((l) => l.q.id).join());
  const [filled, setFilled] = useState<(number | null)[]>(lines.map(() => null));
  const [active, setActive] = useState(0);
  const [checked, setChecked] = useState(false);
  const { elapsed } = useLockAndTimer(0);

  const place = (chip: number) => {
    if (checked) return;
    const next = [...filled];
    next[active] = chip;
    setFilled(next);
    const empty = next.findIndex((f) => f === null);
    if (empty >= 0) setActive(empty);
  };

  return (
    <>
      <div className="wq-eyebrow">Word bank</div>
      <h2 className="wq-prompt">Fill each gap with the right word</h2>
      <p className="wq-sub">Two words won&apos;t be used.</p>
      <div className="wq-bank-lines">
        {lines.map((l, i) => {
          const chip = filled[i];
          const word = chip === null ? null : chips[chip].item;
          let state = chip !== null ? "filled" : "";
          if (checked) state = word?.toLowerCase() === l.q.answer.toLowerCase() ? "right" : "wrong";
          return (
            <p key={l.q.id} className="wq-sentence">
              <Marked
                text={l.q.me}
                gap={
                  <button
                    className={`wq-slot ${state} ${active === i && !checked ? "active" : ""}`}
                    onClick={() => {
                      if (checked) return;
                      setActive(i);
                      if (chip !== null) setFilled(filled.map((f, k) => (k === i ? null : f)));
                    }}
                    aria-label={`Gap ${i + 1}${word ? `: ${word}` : ""}`}
                  >
                    {word ?? " "}
                  </button>
                }
              />
            </p>
          );
        })}
      </div>
      {dock(
        <>
          <div className="wq-chips">
            {chips.map(({ item }, i) => (
              <button key={i} className="wq-chip-btn" disabled={checked || filled.includes(i)} onClick={() => place(i)}>
                {item}
              </button>
            ))}
          </div>
          <button
            className="wq-btn wq-btn-primary"
            disabled={checked || filled.some((f) => f === null)}
            onClick={() => {
              setChecked(true);
              onDone(
                lines.map((l, i) => ({
                  word: l.entry.word,
                  qid: l.q.id,
                  correct: chips[filled[i]!].item.toLowerCase() === l.q.answer.toLowerCase(),
                })),
                elapsed(),
              );
            }}
          >
            Check
          </button>
        </>,
      )}
    </>
  );
}

// ── Write your own sentence ────────────────────────────────────────

export function WriteScreen({ entry, onDone, dock }: { entry: WordEntry; onDone: (text: string | null) => void; dock: Dock }) {
  const [text, setText] = useState("");
  const forms = useMemo(() => formsOf(entry), [entry]);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const usesWord = words.some((w) => forms.includes(w.toLowerCase().replace(/[^a-z]/g, "")));
  const valid = usesWord && words.length >= 5;

  return (
    <>
      <div className="wq-eyebrow">Bonus · +20 XP</div>
      <h2 className="wq-prompt">
        Write your own sentence with <mark>{entry.word}</mark>
      </h2>
      <p className="wq-sub">About your life, your friends, school, anything. Your teacher may read it.</p>
      <textarea
        className="wq-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`e.g. something you want to ${entry.pos === "verb" ? entry.word : "talk about"}…`}
        autoCapitalize="sentences"
        aria-label="Your sentence"
        maxLength={300}
      />
      <p className="wq-cue">
        {!text.trim()
          ? "At least 5 words, using the word (any form)."
          : !usesWord
            ? `Use “${entry.word}” (or a form of it) in your sentence.`
            : words.length < 5
              ? "A little longer: at least 5 words."
              : "Looks good!"}
      </p>
      {dock(
        <div className="wq-row">
          <button className="wq-btn wq-btn-link" onClick={() => onDone(null)}>
            Skip
          </button>
          <button className="wq-btn wq-btn-primary" disabled={!valid} onClick={() => onDone(text.trim())}>
            Save
          </button>
        </div>,
      )}
    </>
  );
}
