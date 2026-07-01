"use client";

import { useState } from "react";
import type {
  GeneratorInput,
  Module,
  TextType,
  ToggleState,
  InferenceLevel,
  DistractorLevel,
} from "@/lib/types";
import { TEXT_TYPE_LABELS, DEFAULT_TOGGLES } from "@/lib/types";

interface Props {
  onGenerate: (input: GeneratorInput) => void;
  isLoading: boolean;
}

export default function GeneratorForm({ onGenerate, isLoading }: Props) {
  const [module, setModule] = useState<Module>("E");
  const [topic, setTopic] = useState("");
  const [textType, setTextType] = useState<TextType>("article");
  const [languageStructures, setLanguageStructures] = useState("");
  const [sources, setSources] = useState("");
  const [toggles, setToggles] = useState<ToggleState>(DEFAULT_TOGGLES);
  const [isDeltaMode, setIsDeltaMode] = useState(false);
  const [deltaText, setDeltaText] = useState("");

  function setToggle<K extends keyof ToggleState>(key: K, value: ToggleState[K]) {
    setToggles((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({
      module,
      topic,
      textType,
      languageStructures,
      sources,
      toggles: { ...toggles, glossary: module === "E" ? true : toggles.glossary },
      isDeltaMode,
      deltaText,
    });
  }

  const dividerClass = "pb-5 mb-5 border-b border-gray-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-0">

      {/* Module selector — card style */}
      <div className={dividerClass}>
        <p className="form-label">Module</p>
        <div className="grid grid-cols-2 gap-2">
          {(["E", "G"] as Module[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModule(m)}
              className={`relative p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                module === m
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
              }`}
            >
              <div className={`text-xl font-bold leading-none mb-1 ${
                module === m ? "text-indigo-600" : "text-gray-600"
              }`}>
                {m}
              </div>
              <div className="text-[11px] leading-snug text-gray-400">
                {m === "E" ? "≤400 words\nvocab task" : "450–500 words\nwriting task"}
              </div>
              {module === m && (
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Delta mode */}
        <label className="flex items-center gap-2.5 cursor-pointer mt-3 group">
          <div className="relative">
            <input
              type="checkbox"
              checked={isDeltaMode}
              onChange={(e) => setIsDeltaMode(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-8 h-4.5 rounded-full transition-colors ${isDeltaMode ? "bg-indigo-500" : "bg-gray-300"}`}
                 style={{ height: "18px", width: "32px" }}>
              <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${isDeltaMode ? "translate-x-4" : "translate-x-0.5"}`}
                   style={{ width: "14px", height: "14px" }} />
            </div>
          </div>
          <span className="text-sm text-gray-600">
            <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mr-1">/delta</span>
            Retrofit an existing text
          </span>
        </label>
      </div>

      {/* Content input */}
      {isDeltaMode ? (
        <div className={dividerClass}>
          <label className="form-label">Paste your text</label>
          <textarea
            value={deltaText}
            onChange={(e) => setDeltaText(e.target.value)}
            rows={9}
            placeholder="Paste the full text here…"
            className="form-input resize-none"
            required
          />
        </div>
      ) : (
        <div className={dividerClass}>
          <div className="mb-4">
            <label className="form-label">Topic / Subject</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Climate activism, Social media, Space travel"
              className="form-input"
              required={!isDeltaMode}
            />
          </div>

          <div>
            <label className="form-label">Text Type</label>
            <select
              value={textType}
              onChange={(e) => setTextType(e.target.value as TextType)}
              className="form-input"
            >
              {Object.entries(TEXT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Language structures + sources */}
      <div className={dividerClass}>
        <div className="mb-4">
          <label className="form-label">Language Structures</label>
          <input
            type="text"
            value={languageStructures}
            onChange={(e) => setLanguageStructures(e.target.value)}
            placeholder="passive voice, third conditional…"
            className="form-input"
          />
          <p className="text-xs text-gray-400 mt-1.5">Optional — comma-separated</p>
        </div>

        <div>
          <label className="form-label">Sources / References</label>
          <textarea
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            rows={2}
            placeholder="Quotes, article titles, names to include…"
            className="form-input resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">Optional</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="pb-6">
        <p className="form-label mb-3">Options</p>

        {/* Inference */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-mono text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">/inference</span>
            <span className="ml-1.5">Question depth</span>
          </p>
          <div className="flex gap-1">
            {(["low", "mid", "high"] as InferenceLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setToggle("inference", lvl)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                  toggles.inference === lvl
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Low = literal · Mid = balanced · High = inferential</p>
        </div>

        {/* Distractors */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-mono text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">/distractors</span>
            <span className="ml-1.5">MCQ difficulty</span>
          </p>
          <div className="flex gap-1">
            {(["tight", "loose"] as DistractorLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setToggle("distractors", lvl)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  toggles.distractors === lvl
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200"
                }`}
              >
                {lvl === "tight" ? "Challenging" : "Easier"}
              </button>
            ))}
          </div>
        </div>

        {/* Boolean toggles */}
        <div className="space-y-2.5">
          {[
            {
              key: "authentic" as const,
              code: "/authentic",
              desc: "Natural, journalistic writing style",
            },
            {
              key: "parallel" as const,
              code: "/parallel",
              desc: "Generate Version A + Version B",
            },
            {
              key: "glossary" as const,
              code: "/glossary",
              desc: "Include vocabulary glossary",
              disabled: module === "E",
              disabledNote: "always on for Module E",
            },
            {
              key: "scaffold" as const,
              code: "/scaffold",
              desc: "Line numbers + vocabulary box",
            },
          ].map(({ key, code, desc, disabled, disabledNote }) => {
            const isChecked = key === "glossary" && module === "E" ? true : toggles[key] as boolean;
            return (
              <label
                key={key}
                className={`flex items-start gap-2.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}
              >
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => !disabled && setToggle(key, e.target.checked as ToggleState[typeof key])}
                    disabled={disabled}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isChecked ? "bg-indigo-500 border-indigo-500" : "border-gray-300 bg-white"
                  }`}>
                    {isChecked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm leading-snug">
                  <span className="font-mono text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mr-1.5">{code}</span>
                  <span className="text-gray-600">{desc}</span>
                  {disabledNote && (
                    <span className="text-indigo-400 ml-1 text-xs">({disabledNote})</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: isLoading
            ? "#6366f1"
            : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          boxShadow: isLoading ? "none" : "0 4px 14px rgba(99,102,241,0.4)",
        }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Generating…
          </>
        ) : (
          <>
            {isDeltaMode ? "Retrofit Text" : "Generate Exam"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
