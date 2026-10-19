"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy fix request for Claude" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="rounded-xl border border-gray-300 font-semibold px-3 py-1.5 hover:bg-gray-50"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
