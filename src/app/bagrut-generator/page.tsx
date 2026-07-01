"use client";

import { useState } from "react";
import Link from "next/link";
import GeneratorForm from "@/components/GeneratorForm";
import OutputDisplay from "@/components/OutputDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import { parseOutput } from "@/lib/prompt";
import type { GeneratorInput, ParsedOutput } from "@/lib/types";

export default function BagrutGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<ParsedOutput | null>(null);
  const [lastModule, setLastModule] = useState<"E" | "G">("E");
  const [lastParallel, setLastParallel] = useState(false);

  async function handleGenerate(input: GeneratorInput) {
    setIsLoading(true);
    setError(null);
    setOutput(null);
    setLastModule(input.module);
    setLastParallel(input.toggles.parallel);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Something went wrong.");
      }

      setOutput(parseOutput(data.raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="print:hidden" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Breadcrumb */}
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-white text-xs font-medium mb-3 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Practice Materials
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight tracking-tight">
                  Bagrut Unseen Generator
                </h1>
                <p className="text-indigo-300 text-xs mt-0.5">
                  Module E &amp; G · 5-point Bagrut · Powered by Claude AI
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)" }}>
                2025 Spec
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar — form */}
          <aside className="lg:w-80 xl:w-96 shrink-0 print:hidden">
            <div className="sticky top-6">
              <div className="mb-3 px-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Exam Settings
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 overflow-hidden"
                   style={{ boxShadow: "0 2px 8px rgba(0,0,0,.06), 0 8px 32px rgba(0,0,0,.04)" }}>
                <GeneratorForm onGenerate={handleGenerate} isLoading={isLoading} />
              </div>
            </div>
          </aside>

          {/* Main content — output */}
          <main className="flex-1 min-w-0">
            {!output && !isLoading && !error && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-16 text-center"
                   style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,.03)" }}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                     style={{ background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                       stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </div>
                <p className="font-semibold text-gray-700 text-base">
                  Your exam will appear here
                </p>
                <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Choose a module and topic on the left, then click <span className="font-medium text-gray-500">Generate</span> to create a Bagrut-ready unseen exam.
                </p>
              </div>
            )}

            {isLoading && <LoadingSpinner />}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                <strong className="block font-semibold mb-1">Generation failed</strong>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {output && !isLoading && (
              <OutputDisplay
                output={output}
                module={lastModule}
                hasParallel={lastParallel}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
