"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { ParsedOutput } from "@/lib/types";
import PracticeMode from "./PracticeMode";

interface Props {
  output: ParsedOutput;
  module: "E" | "G";
  hasParallel: boolean;
}

type ActiveVersion = "A" | "B";
type SectionVariant = "text" | "glossary" | "tasks" | "answers" | "writing" | "default";

const VARIANT_CONFIG: Record<
  SectionVariant,
  { card: string; badge: string; badgeClass: string; titleColor: string }
> = {
  text: {
    card: "bg-white border-l-[3px] border-l-indigo-400",
    badge: "Reading Text",
    badgeClass: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    titleColor: "text-gray-800",
  },
  glossary: {
    card: "bg-amber-50/60 border-amber-100",
    badge: "Glossary",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
    titleColor: "text-amber-900",
  },
  tasks: {
    card: "bg-white",
    badge: "Exam Paper",
    badgeClass: "bg-indigo-600 text-white border border-indigo-700",
    titleColor: "text-gray-800",
  },
  answers: {
    card: "bg-emerald-50/60 border-emerald-100",
    badge: "Teacher Only",
    badgeClass: "bg-emerald-600 text-white border border-emerald-700",
    titleColor: "text-emerald-900",
  },
  writing: {
    card: "bg-sky-50/60 border-sky-100",
    badge: "Writing Task",
    badgeClass: "bg-sky-600 text-white border border-sky-700",
    titleColor: "text-sky-900",
  },
  default: {
    card: "bg-white",
    badge: "",
    badgeClass: "",
    titleColor: "text-gray-800",
  },
};

// ── Task Sheet custom renderer ───────────────────────

function TSTextBlock({ block }: { block: string }) {
  return (
    <div className="ts-text-block">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{block}</ReactMarkdown>
    </div>
  );
}

function QuestionCard({ block }: { block: string }) {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const firstLine = lines[0];
  const numMatch = firstLine.match(/^(\d+)\.\s*(.*)/);
  if (!numMatch) return null;

  const number = numMatch[1];
  const questionText = numMatch[2];

  const options: { letter: string; text: string }[] = [];
  const subLines: string[] = [];
  let stem = "";
  let pointsStr = "";

  for (const line of lines.slice(1)) {
    const optM = line.match(/^(iv|iii|ii|i)\)\s+(.+)/i);
    const ptsM = line.match(/^\((\d+)\s*points?\)/);

    if (optM) {
      options.push({ letter: optM[1], text: optM[2] });
    } else if (ptsM) {
      pointsStr = line;
    } else if (line.includes("___")) {
      stem = line;
    } else {
      subLines.push(line);
    }
  }

  return (
    <div className="question-card">
      <span className="q-num-badge">{number}</span>
      <div className="q-body">
        {questionText && <div className="q-main-text">{questionText}</div>}
        {subLines.map((l, i) => {
          if (l === "COMPLETE THE ANSWER." || l === "COMPLETE THE SENTENCE.") {
            return <div key={i} className="q-instruction">{l}</div>;
          }
          if (l.startsWith("ANSWER:")) {
            return <div key={i} className="q-answer-label">{l}</div>;
          }
          if (l.startsWith("Give") || l.startsWith("Base your")) {
            return <div key={i} className="q-guidance">{l}</div>;
          }
          return <div key={i} className="q-main-text mt-1">{l}</div>;
        })}
        {stem && <div className="completion-stem">{stem}</div>}
        {options.length > 0 && (
          <div className="mcq-options">
            {options.map((opt, i) => (
              <div key={i} className="mcq-option-row">
                <span className="option-roman">{opt.letter})</span>
                <span className="option-content">{opt.text}</span>
              </div>
            ))}
          </div>
        )}
        {pointsStr && <div className="q-points">{pointsStr}</div>}
      </div>
    </div>
  );
}

function VocabBlock({ block }: { block: string }) {
  const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const firstLine = lines[0];
  const numMatch = firstLine.match(/^\((\d+)\)\s*(.*)/);
  if (!numMatch) return null;

  const number = numMatch[1];
  const category = numMatch[2];

  const items: { num: string; text: string }[] = [];
  const defs: { letter: string; text: string }[] = [];

  for (const line of lines.slice(1)) {
    const itemM = line.match(/^(\d+)\.\s+(.+)/);
    const defM = line.match(/^([A-C])\.\s+_+\s+(.+)/i) || line.match(/^([A-C])\.\s+(.+)/i);

    if (itemM) {
      items.push({ num: itemM[1], text: itemM[2] });
    } else if (defM) {
      defs.push({ letter: defM[1], text: defM[2] });
    }
  }

  return (
    <div className="vocab-question-block">
      <div className="vocab-block-title">
        ({number}) {category}
      </div>
      {items.length > 0 && (
        <div className="vocab-items-grid">
          {items.map((item, i) => (
            <div key={i} className="vocab-item">
              <span className="vocab-item-num">{item.num}.</span>
              {item.text}
            </div>
          ))}
        </div>
      )}
      {defs.length > 0 && (
        <div className="vocab-defs">
          {defs.map((def, i) => (
            <div key={i} className="vocab-def-row">
              <span className="vocab-def-letter">{def.letter}.</span>
              <span className="vocab-def-blank" />
              <span className="vocab-def-text">{def.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskSheetRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="task-sheet-renderer">
      {blocks.map((raw, i) => {
        const block = raw.trim();
        if (!block) return null;

        if (block === "---") {
          return <hr key={i} className="ts-divider" />;
        }

        if (block.startsWith("PART I:") || block.startsWith("PART II:")) {
          const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
          return (
            <div key={i} className="ts-part-block">
              <div className="ts-part-title">{lines[0]}</div>
              {lines.slice(1).map((l, j) => (
                <div key={j} className="ts-part-sub">{l}</div>
              ))}
            </div>
          );
        }

        if (/^\d+\./.test(block)) {
          return <QuestionCard key={i} block={block} />;
        }

        if (/^\(\d+\)/.test(block)) {
          return <VocabBlock key={i} block={block} />;
        }

        return <TSTextBlock key={i} block={block} />;
      })}
    </div>
  );
}

// ── Generic Section card ─────────────────────────────

function Section({
  title,
  content,
  variant = "default",
  children,
  printAlwaysVisible = false,
}: {
  title: string;
  content: string;
  variant?: SectionVariant;
  children?: React.ReactNode;
  printAlwaysVisible?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!content) return null;
  const v = VARIANT_CONFIG[variant];

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={`section-card ${v.card} ${printAlwaysVisible ? "print-visible" : ""}`}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className={`text-sm font-bold ${v.titleColor}`}>{title}</h2>
          {v.badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide ${v.badgeClass}`}>
              {v.badge}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="print:hidden shrink-0 ml-3 text-xs text-gray-400 hover:text-gray-600 rounded-lg px-2.5 py-1 border border-gray-200 hover:border-gray-300 bg-white transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Main export ──────────────────────────────────────

export default function OutputDisplay({ output, module, hasParallel }: Props) {
  const [activeVersion, setActiveVersion] = useState<ActiveVersion>("A");
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  const isVersionB = activeVersion === "B" && hasParallel;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      {!practiceMode && (
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {hasParallel && (
            <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              {(["A", "B"] as ActiveVersion[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setActiveVersion(v)}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    activeVersion === v ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Version {v}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowAnswerKey((s) => !s)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors shadow-sm ${
              showAnswerKey
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showAnswerKey ? "Hide Answer Key" : "Show Answer Key"}
          </button>

          <button
            onClick={() => setPracticeMode(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Student Practice
          </button>

          <button
            onClick={handlePrint}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / PDF
          </button>
        </div>
      )}

      {/* Practice mode */}
      {practiceMode && (
        <PracticeMode
          taskSheet={output.taskSheet}
          answerKey={output.answerKey}
          unseenText={output.unseenText}
          module={module}
          onClose={() => setPracticeMode(false)}
        />
      )}

      {/* Exam content */}
      {!practiceMode && !isVersionB && (
        <>
          {/* Print-only exam header */}
          <div className="print-exam-header border-b-2 border-gray-800 pb-4 mb-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-lg font-bold">
                  ENGLISH — MODULE {module} (5 POINTS)
                </div>
                <div className="text-sm text-gray-600 mt-0.5">
                  {module === "E"
                    ? "WRITTEN RECEPTION & LEXICAL KNOWLEDGE"
                    : "WRITTEN RECEPTION & WRITTEN PRODUCTION"}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Date: __________________</div>
                <div className="mt-1">Time: 2 hours</div>
              </div>
            </div>
            <div className="text-sm">
              Student Name:{" "}
              <span style={{ display: "inline-block", width: "240px", borderBottom: "1px solid #000", marginRight: "24px" }} />
              Class:{" "}
              <span style={{ display: "inline-block", width: "60px", borderBottom: "1px solid #000" }} />
            </div>
          </div>

          <Section title="Unseen Text" content={output.unseenText} variant="text" printAlwaysVisible>
            <div className="exam-text">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{output.unseenText}</ReactMarkdown>
            </div>
          </Section>

          {output.glossary && (
            <Section title="Glossary" content={output.glossary} variant="glossary" printAlwaysVisible>
              <div className="prose-content">
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{output.glossary}</ReactMarkdown>
              </div>
            </Section>
          )}

          <Section
            title={`Task Sheet — Module ${module}`}
            content={output.taskSheet}
            variant="tasks"
            printAlwaysVisible
          >
            <TaskSheetRenderer content={output.taskSheet} />
          </Section>

          {module === "G" && output.writingPrompt && (
            <Section title="Writing Task" content={output.writingPrompt} variant="writing" printAlwaysVisible>
              <div className="prose-content">
                <ReactMarkdown>{output.writingPrompt}</ReactMarkdown>
              </div>
            </Section>
          )}

          {showAnswerKey && (
            <Section title="Answer Key & Marking Notes" content={output.answerKey} variant="answers">
              <div className="prose-content">
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>{output.answerKey}</ReactMarkdown>
              </div>
            </Section>
          )}
        </>
      )}

      {!practiceMode && isVersionB && (
        <>
          <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm text-purple-700 font-medium">
            Version B — alternative parallel text on the same topic
          </div>
          <Section title="Version B — Unseen Text" content={output.versionB} variant="text">
            <div className="exam-text">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{output.versionB}</ReactMarkdown>
            </div>
          </Section>
        </>
      )}

      {/* Bottom print button */}
      {!practiceMode && output.taskSheet && (
        <div className="print:hidden pt-1 pb-6">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all"
            style={{
              background: "linear-gradient(135deg,#059669 0%,#10b981 100%)",
              boxShadow: "0 4px 14px rgba(16,185,129,.35)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
