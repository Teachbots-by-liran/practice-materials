"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

// ── Types ────────────────────────────────────────────

interface MCQQuestion {
  type: "mcq";
  number: number;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  points: number;
}

interface CompletionQuestion {
  type: "completion";
  number: number;
  questionText: string;
  instruction: string;
  stem: string;
  guidance: string;
  modelAnswer: string;
  points: number;
}

interface OpenQuestion {
  type: "open";
  number: number;
  questionText: string;
  modelAnswer: string;
  points: number;
}

type ComprehensionQuestion = MCQQuestion | CompletionQuestion | OpenQuestion;

interface VocabQuestion {
  number: number;
  category: string;
  items: { num: string; text: string }[];
  definitions: { letter: string; text: string }[];
  answers: Record<string, string>;
}

// ── Parsers ──────────────────────────────────────────

function parseAnswerMap(answerKey: string): Record<number, string> {
  const map: Record<number, string> = {};
  for (const line of answerKey.split("\n")) {
    const m = line.trim().match(/^\*{0,2}(\d+)[.)]\*{0,2}\s+(.+)/);
    if (m) map[parseInt(m[1])] = m[2].trim();
  }
  return map;
}

function extractMCQLetter(answer: string): string {
  const m = answer.match(/^(iv|iii|ii|i)\)/i);
  return m ? m[1].toLowerCase() : "";
}

function parseComprehensionQuestions(
  taskSheet: string,
  answerKey: string
): ComprehensionQuestion[] {
  const answerMap = parseAnswerMap(answerKey);
  const blocks = taskSheet.split(/\n{2,}/);
  const questions: ComprehensionQuestion[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const qMatch = lines[0].match(/^(\d+)\.\s*(.*)/);
    if (!qMatch) continue;
    const num = parseInt(qMatch[1]);
    if (num < 1 || num > 9) continue;

    let questionText = qMatch[2].trim();
    const options: Record<string, string> = {};
    let isCompletion = false;
    let instruction = "";
    let stem = "";
    let guidance = "";
    let points = 8;
    const extraLines: string[] = [];

    for (const line of lines.slice(1)) {
      const optM = line.match(/^(iv|iii|ii|i)\)\s+(.+)/i);
      const ptsM = line.match(/^\((\d+)\s*points?\)/);
      const completionM =
        line === "COMPLETE THE ANSWER." ||
        line === "COMPLETE THE SENTENCE." ||
        line === "COMPLETE THE FOLLOWING SENTENCE.";
      // Stems may use underscores (old format) or dots (new format matching real exams)
      const stemM = (/_{2,}/.test(line) || /\.{5,}/.test(line)) && !line.match(/^ANSWER:/i);

      if (optM) {
        options[optM[1].toLowerCase()] = optM[2];
      } else if (ptsM) {
        points = parseInt(ptsM[1]);
      } else if (completionM) {
        isCompletion = true;
        instruction = line;
      } else if (line.match(/^ANSWER:/i)) {
        // New-format Type B: "ANSWER: .........." on its own line — question text is already in questionText
      } else if (stemM) {
        stem = line;
      } else if (
        line.startsWith("Give") ||
        line.startsWith("Base your") ||
        line.startsWith("In paragraph") ||
        line.startsWith("Use information")
      ) {
        guidance = line;
      } else {
        extraLines.push(line);
      }
    }

    if (questionText === "" && extraLines.length > 0) {
      questionText = extraLines.shift() || "";
    }

    const rawAnswer = answerMap[num] || "";

    if (Object.keys(options).length >= 3) {
      questions.push({
        type: "mcq",
        number: num,
        questionText,
        options,
        correctAnswer: extractMCQLetter(rawAnswer),
        points,
      });
    } else if (isCompletion || stem) {
      questions.push({
        type: "completion",
        number: num,
        questionText,
        instruction: instruction || "COMPLETE THE ANSWER.",
        stem: stem || questionText,
        guidance,
        modelAnswer: rawAnswer,
        points,
      });
    } else {
      questions.push({
        type: "open",
        number: num,
        questionText,
        modelAnswer: rawAnswer,
        points,
      });
    }
  }

  return questions.sort((a, b) => a.number - b.number);
}

function parseVocabQuestions(
  taskSheet: string,
  answerKey: string
): VocabQuestion[] {
  // Parse answer key — support (8)–(14) to handle both old (10–14) and new (8–12) formats
  const vocabAnswers: Record<number, Record<string, string>> = {};
  for (const line of answerKey.split("\n")) {
    const qMatch = line.match(/\((\d+)\)/);
    if (!qMatch) continue;
    const qNum = parseInt(qMatch[1]);
    if (qNum < 8 || qNum > 14) continue;
    const matches: Record<string, string> = {};
    for (const m of line.matchAll(/([A-C])=(\d)/g)) matches[m[1]] = m[2];
    if (Object.keys(matches).length === 0) {
      for (const m of line.matchAll(/([A-C])[=.]\s*(\d)/g)) matches[m[1]] = m[2];
    }
    if (Object.keys(matches).length > 0) vocabAnswers[qNum] = matches;
  }

  const partIIStart = taskSheet.search(/PART II/i);
  if (partIIStart === -1) return [];
  const partII = taskSheet.slice(partIIStart);

  // Line-by-line parsing: accumulate items AND definitions under the same question header,
  // even when they are separated by blank lines (which breaks paragraph-block parsing).
  const questions: VocabQuestion[] = [];
  let current: VocabQuestion | null = null;

  for (const rawLine of partII.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // New question header: (10), (11), (8), etc.
    const headerM = line.match(/^\((\d+)\)\s*(.*)/);
    if (headerM) {
      const num = parseInt(headerM[1]);
      if (num >= 8 && num <= 14) {
        if (current && current.items.length > 0) questions.push(current);
        current = {
          number: num,
          category: headerM[2].trim().replace(/^[-–—]|[-–—]$/g, "").trim(),
          items: [],
          definitions: [],
          answers: vocabAnswers[num] || {},
        };
        continue;
      }
    }

    if (!current) continue;

    // Word item: "1. to demonstrate" or "1. achieve"
    const itemM = line.match(/^(\d+)\.\s+(.+)/);
    if (itemM) {
      current.items.push({ num: itemM[1], text: itemM[2].replace(/^to\s+/, "") });
      continue;
    }

    // Definition: "A. ___ to get..." or "A. to get..." or "A) ___ to get..."
    const defM = line.match(/^([A-C])[.)]\s*_{0,}\.{0,}\s*(.*)/);
    if (defM && defM[2].trim().length > 2) {
      current.definitions.push({ letter: defM[1], text: defM[2].trim() });
    }
  }

  if (current && current.items.length > 0) questions.push(current);
  return questions;
}

// ── Comprehension question cards ─────────────────────

function MCQCard({
  q,
  selected,
  submitted,
  onChange,
}: {
  q: MCQQuestion;
  selected: string;
  submitted: boolean;
  onChange: (val: string) => void;
}) {
  const isCorrect = submitted && selected === q.correctAnswer;
  const isWrong = submitted && selected !== "" && selected !== q.correctAnswer;
  const numStyle = {
    background: submitted
      ? isCorrect ? "#d1fae5" : isWrong ? "#fee2e2" : "#eef2ff"
      : "#eef2ff",
    color: submitted
      ? isCorrect ? "#065f46" : isWrong ? "#7f1d1d" : "#4f46e5"
      : "#4f46e5",
  };

  return (
    <div className={`practice-question-card ${submitted ? (isCorrect ? "answered-correct" : isWrong ? "answered-wrong" : "") : ""}`}>
      <div className="flex gap-3 mb-3">
        <span className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-black" style={numStyle}>
          {submitted ? (isCorrect ? "✓" : isWrong ? "✗" : q.number) : q.number}
        </span>
        <p className="text-sm font-medium text-gray-800 leading-snug pt-0.5">{q.questionText}</p>
      </div>

      <div className="flex flex-col gap-2 ml-10">
        {(["i", "ii", "iii", "iv"] as const).filter((k) => q.options[k]).map((key) => {
          let cls = "practice-option-btn";
          if (submitted) {
            if (key === q.correctAnswer) cls += " show-correct";
            else if (key === selected) cls += " wrong";
          } else if (key === selected) {
            cls += " selected";
          }
          return (
            <button key={key} className={cls} onClick={() => !submitted && onChange(key)} disabled={submitted}>
              <span className="text-xs font-bold text-gray-400 shrink-0 w-6">{key})</span>
              <span className="flex-1">{q.options[key]}</span>
            </button>
          );
        })}
      </div>

      <div className="ml-10 mt-2 text-xs text-gray-400">{q.points} points</div>
      {submitted && !isCorrect && q.correctAnswer && (
        <div className="ml-10 mt-1 text-xs text-emerald-700 font-medium">
          ✓ Correct: {q.correctAnswer})
        </div>
      )}
    </div>
  );
}

function CompletionCard({
  q,
  value,
  submitted,
  onChange,
}: {
  q: CompletionQuestion;
  value: string;
  submitted: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`practice-question-card ${submitted ? "answered-open" : ""}`}>
      <div className="flex gap-3">
        <span className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-black" style={{ background: "#eef2ff", color: "#4f46e5" }}>
          {q.number}
        </span>
        <div className="flex-1">
          {q.questionText && q.questionText !== q.stem && (
            <p className="text-sm font-medium text-gray-800 leading-snug mb-2">{q.questionText}</p>
          )}
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">{q.instruction}</p>
          <div className="completion-stem mb-3">{q.stem}</div>
          {q.guidance && <p className="text-xs text-gray-400 italic mb-2">{q.guidance}</p>}
          <textarea
            className="practice-text-input"
            rows={2}
            placeholder="Write your answer here…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={submitted}
          />
          {submitted && (
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 mb-0.5">Model answer</p>
              <p className="text-sm text-emerald-900">{q.modelAnswer || "See answer key."}</p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-10 mt-2 text-xs text-gray-400">{q.points} points</div>
    </div>
  );
}

function OpenCard({
  q,
  value,
  submitted,
  onChange,
}: {
  q: OpenQuestion;
  value: string;
  submitted: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`practice-question-card ${submitted ? "answered-open" : ""}`}>
      <div className="flex gap-3">
        <span className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full text-xs font-black" style={{ background: "#eef2ff", color: "#4f46e5" }}>
          {q.number}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 leading-snug mb-2">{q.questionText}</p>
          <textarea
            className="practice-text-input"
            rows={2}
            placeholder="Write your answer here…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={submitted}
          />
          {submitted && (
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 mb-0.5">Model answer</p>
              <p className="text-sm text-emerald-900">{q.modelAnswer || "See answer key."}</p>
            </div>
          )}
        </div>
      </div>
      <div className="ml-10 mt-2 text-xs text-gray-400">{q.points} points</div>
    </div>
  );
}

// ── Vocab drag-and-drop card ─────────────────────────

function VocabCard({
  q,
  placedAnswers,
  submitted,
  onPlace,
}: {
  q: VocabQuestion;
  placedAnswers: Record<string, string>;
  submitted: boolean;
  onPlace: (defLetter: string, itemNum: string) => void;
}) {
  const [draggingNum, setDraggingNum] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const usedNums = new Set(Object.values(placedAnswers).filter(Boolean));

  function handleChipClick(num: string) {
    if (submitted) return;
    setSelectedChip(selectedChip === num ? null : num);
  }

  function handleSlotClick(letter: string) {
    if (submitted) return;
    if (selectedChip) {
      onPlace(letter, selectedChip);
      setSelectedChip(null);
    } else if (placedAnswers[letter]) {
      onPlace(letter, "");
    }
  }

  function chipStatus(num: string) {
    if (submitted) return "neutral";
    if (selectedChip === num) return "selected";
    if (usedNums.has(num)) return "used";
    return "free";
  }

  function slotStatus(letter: string) {
    if (!submitted) return hoverSlot === letter ? "hover" : "empty";
    const placed = placedAnswers[letter];
    if (!placed) return "empty";
    return placed === q.answers[letter] ? "correct" : "wrong";
  }

  return (
    <div className="vocab-practice-card">
      <div className="vocab-practice-header">
        <span className="q-num-badge">{q.number}</span>
        <span className="vocab-category-label">{q.category}</span>
      </div>

      {/* Word chips */}
      <div className="vocab-chips-row">
        {q.items.map((item) => {
          const status = chipStatus(item.num);
          return (
            <div
              key={item.num}
              draggable={!submitted && status !== "used"}
              onDragStart={() => { setDraggingNum(item.num); setSelectedChip(null); }}
              onDragEnd={() => setDraggingNum(null)}
              onClick={() => handleChipClick(item.num)}
              className={`vocab-chip vocab-chip--${status} ${draggingNum === item.num ? "dragging" : ""}`}
            >
              <span className="chip-num">{item.num}</span>
              {item.text}
            </div>
          );
        })}
      </div>

      {/* Definition slots */}
      <div className="vocab-def-slots">
        {q.definitions.map((def) => {
          const status = slotStatus(def.letter);
          const placed = placedAnswers[def.letter];
          const placedItem = placed ? q.items.find((i) => i.num === placed) : null;
          const correctNum = q.answers[def.letter];
          const correctItem = submitted ? q.items.find((i) => i.num === correctNum) : null;

          return (
            <div
              key={def.letter}
              className={`vocab-def-row vocab-def-row--${status}`}
              onDragOver={(e) => { e.preventDefault(); setHoverSlot(def.letter); }}
              onDragLeave={() => setHoverSlot(null)}
              onDrop={() => {
                if (draggingNum) { onPlace(def.letter, draggingNum); }
                setDraggingNum(null); setHoverSlot(null);
              }}
              onClick={() => handleSlotClick(def.letter)}
            >
              <span className="def-letter-badge">{def.letter}.</span>
              <div className={`def-slot ${placedItem ? "filled" : ""}`}>
                {placedItem ? placedItem.text : (selectedChip ? "← click to place" : "drop here")}
              </div>
              <span className="def-text-content">{def.text}</span>
              {submitted && status === "wrong" && correctItem && (
                <span className="def-correct-hint">✓ {correctItem.text}</span>
              )}
            </div>
          );
        })}
      </div>

      {submitted && Object.keys(q.answers).length === 0 && (
        <p className="text-xs text-amber-600 mt-2">Answers not available — check the answer key.</p>
      )}
    </div>
  );
}

// ── Main PracticeMode component ───────────────────────

interface Props {
  taskSheet: string;
  answerKey: string;
  unseenText: string;
  module: "E" | "G";
  onClose: () => void;
}

type Tab = "comprehension" | "vocabulary";

export default function PracticeMode({ taskSheet, answerKey, unseenText, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("comprehension");
  const [textOpen, setTextOpen] = useState(true);

  // Comprehension state
  const questions = useMemo(() => parseComprehensionQuestions(taskSheet, answerKey), [taskSheet, answerKey]);
  const [cAnswers, setCAnswers] = useState<Record<number, string>>({});
  const [cSubmitted, setCSubmitted] = useState(false);

  // Vocab state
  const vocabQuestions = useMemo(() => parseVocabQuestions(taskSheet, answerKey), [taskSheet, answerKey]);
  const [vAnswers, setVAnswers] = useState<Record<number, Record<string, string>>>({});
  const [vSubmitted, setVSubmitted] = useState(false);

  const mcqQs = questions.filter((q): q is MCQQuestion => q.type === "mcq");
  const mcqCorrect = cSubmitted
    ? mcqQs.filter((q) => (cAnswers[q.number] || "") === q.correctAnswer).length
    : 0;
  const unanswered = mcqQs.filter((q) => !cAnswers[q.number]).length;

  function placeVocab(qNum: number, letter: string, itemNum: string) {
    setVAnswers((prev) => ({
      ...prev,
      [qNum]: { ...(prev[qNum] || {}), [letter]: itemNum || undefined as unknown as string },
    }));
  }

  const hasVocab = vocabQuestions.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 text-base">Student Practice</h2>
          <p className="text-xs text-gray-500 mt-0.5">The reading text is shown above the questions for reference.</p>
        </div>
        <button onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          ← Back to exam
        </button>
      </div>

      {/* Tabs */}
      {hasVocab && (
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm w-fit">
          {(["comprehension", "vocabulary"] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}>
              {tab === "comprehension"
                ? `Questions 1–${questions[questions.length - 1]?.number ?? 9}`
                : `Vocabulary ${vocabQuestions[0]?.number ?? 10}–${vocabQuestions[vocabQuestions.length - 1]?.number ?? 14}`}
            </button>
          ))}
        </div>
      )}

      {/* Reading text (collapsible) */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden">
        <button
          onClick={() => setTextOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Reading Text
          </span>
          <span className="text-indigo-400">{textOpen ? "▲ hide" : "▼ show"}</span>
        </button>
        {textOpen && (
          <div className="px-5 pb-4 border-t border-indigo-100">
            <div className="exam-text mt-3" style={{ fontSize: "0.875rem", lineHeight: "1.85" }}>
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{unseenText}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* ── Comprehension tab ─────────────── */}
      {activeTab === "comprehension" && (
        <>
          {/* Score banner */}
          {cSubmitted && mcqQs.length > 0 && (
            <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{
              background: mcqCorrect === mcqQs.length
                ? "linear-gradient(135deg,#d1fae5,#a7f3d0)"
                : mcqCorrect >= mcqQs.length * 0.6
                ? "linear-gradient(135deg,#fef9c3,#fde68a)"
                : "linear-gradient(135deg,#fee2e2,#fecaca)",
            }}>
              <span className="text-3xl font-black" style={{
                color: mcqCorrect === mcqQs.length ? "#065f46" : mcqCorrect >= mcqQs.length * 0.6 ? "#78350f" : "#7f1d1d",
              }}>
                {mcqCorrect}/{mcqQs.length}
              </span>
              <div>
                <p className="font-semibold text-sm text-gray-800">MCQ questions correct</p>
                <p className="text-xs text-gray-600">Model answers shown below for open questions.</p>
              </div>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="font-semibold text-amber-800 mb-1">Could not parse questions</p>
              <p className="text-sm text-amber-700">Try submitting again or check the task sheet above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => {
                if (q.type === "mcq") return (
                  <MCQCard key={q.number} q={q} selected={cAnswers[q.number] || ""}
                    submitted={cSubmitted} onChange={(v) => setCAnswers((p) => ({ ...p, [q.number]: v }))} />
                );
                if (q.type === "completion") return (
                  <CompletionCard key={q.number} q={q} value={cAnswers[q.number] || ""}
                    submitted={cSubmitted} onChange={(v) => setCAnswers((p) => ({ ...p, [q.number]: v }))} />
                );
                return (
                  <OpenCard key={q.number} q={q} value={cAnswers[q.number] || ""}
                    submitted={cSubmitted} onChange={(v) => setCAnswers((p) => ({ ...p, [q.number]: v }))} />
                );
              })}
            </div>
          )}

          {!cSubmitted ? (
            <button onClick={() => setCSubmitted(true)}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                boxShadow: "0 4px 14px rgba(99,102,241,.4)",
                opacity: unanswered > 0 ? 0.7 : 1,
              }}>
              {unanswered > 0
                ? `Submit — ${unanswered} MCQ question${unanswered > 1 ? "s" : ""} unanswered`
                : "Submit All Answers"}
            </button>
          ) : (
            <button onClick={() => { setCAnswers({}); setCSubmitted(false); }}
              className="w-full py-3 rounded-xl font-semibold text-sm text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-50 transition-colors">
              Try Again
            </button>
          )}
        </>
      )}

      {/* ── Vocabulary tab ───────────────── */}
      {activeTab === "vocabulary" && hasVocab && (
        <>
          <div className="text-xs text-gray-500 px-1">
            Drag (or tap) a word from the list to its matching definition. Each question has 6 words but only 3 match.
          </div>

          {!vSubmitted && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2 text-xs text-indigo-700 font-medium">
              💡 Click a word to select it (turns blue), then click a slot to place it. Or drag and drop. Click a filled slot to remove the word.
            </div>
          )}

          {vSubmitted && (() => {
            let correct = 0, total = 0;
            for (const q of vocabQuestions) {
              for (const [letter, correctNum] of Object.entries(q.answers)) {
                total++;
                if ((vAnswers[q.number] || {})[letter] === correctNum) correct++;
              }
            }
            return (
              <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{
                background: correct === total
                  ? "linear-gradient(135deg,#d1fae5,#a7f3d0)"
                  : correct >= total * 0.6
                  ? "linear-gradient(135deg,#fef9c3,#fde68a)"
                  : "linear-gradient(135deg,#fee2e2,#fecaca)",
              }}>
                <span className="text-3xl font-black" style={{
                  color: correct === total ? "#065f46" : correct >= total * 0.6 ? "#78350f" : "#7f1d1d",
                }}>
                  {correct}/{total}
                </span>
                <p className="font-semibold text-sm text-gray-800">vocabulary matches correct</p>
              </div>
            );
          })()}

          <div className="space-y-4">
            {vocabQuestions.map((q) => (
              <VocabCard
                key={q.number}
                q={q}
                placedAnswers={vAnswers[q.number] || {}}
                submitted={vSubmitted}
                onPlace={(letter, num) => placeVocab(q.number, letter, num)}
              />
            ))}
          </div>

          {!vSubmitted ? (
            <button onClick={() => setVSubmitted(true)}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 14px rgba(99,102,241,.4)" }}>
              Check Vocabulary Answers
            </button>
          ) : (
            <button onClick={() => { setVAnswers({}); setVSubmitted(false); }}
              className="w-full py-3 rounded-xl font-semibold text-sm text-indigo-700 border-2 border-indigo-200 hover:bg-indigo-50 transition-colors">
              Try Again
            </button>
          )}
        </>
      )}
    </div>
  );
}
