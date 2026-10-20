"use client";

import { useState } from "react";

/** The class's own join link: copy it into WhatsApp, or show the QR code on the projector. */
export function ClassLink({ url, code, qrSvg }: { url: string; code: string; qrSvg: string }) {
  const [copied, setCopied] = useState(false);
  const [big, setBig] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="section-card !p-4 flex flex-wrap items-center gap-4">
      <button
        onClick={() => setBig(true)}
        className="w-24 h-24 shrink-0 rounded-lg border border-gray-200 p-1 hover:border-indigo-400"
        aria-label="Show the QR code large"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="min-w-0 space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Class link</div>
        <div className="font-mono text-sm text-gray-900 break-all">{url}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="rounded-lg bg-indigo-600 text-white text-sm font-semibold px-3 py-1.5 hover:bg-indigo-700">
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <button onClick={() => setBig(true)} className="rounded-lg border border-gray-300 text-sm font-semibold px-3 py-1.5 hover:bg-gray-50">
            Show QR for the projector
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Students open it, type a name and a 4-digit PIN, and they&apos;re in. Code if needed: <b className="font-mono">{code}</b>
        </div>
      </div>

      {big && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 p-6 cursor-pointer"
          onClick={() => setBig(false)}
          role="dialog"
          aria-label="QR code for students"
        >
          <div className="w-[min(70vh,80vw)] h-[min(70vh,80vw)]" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Scan to join Word Quest</div>
            <div className="font-mono text-lg text-gray-600 mt-1 break-all">{url.replace(/^https?:\/\//, "")}</div>
            <div className="text-sm text-gray-400 mt-3">Click anywhere to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
