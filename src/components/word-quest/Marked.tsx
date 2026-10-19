import { Fragment, type ReactNode } from "react";

/** Renders "{word}" as a highlight and "{_}" as whatever `gap` is. */
export function Marked({ text, gap }: { text: string; gap?: ReactNode }) {
  const parts = text.split(/(\{[^{}]+\})/);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{(.+)\}$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        if (m[1] === "_") return <Fragment key={i}>{gap ?? <span className="wq-gap">&nbsp;</span>}</Fragment>;
        return <mark key={i}>{m[1]}</mark>;
      })}
    </>
  );
}

/** Plain text with marks and gaps removed, for measuring how much there is to read. */
export function plain(text: string): string {
  return text.replace(/\{_\}/g, "___").replace(/[{}]/g, "");
}

export function Boxes({ answer, typed, ghostFirst }: { answer: string; typed: string; ghostFirst?: boolean }) {
  return (
    <span className="wq-boxes" aria-hidden="true">
      {[...answer].map((c, k) => {
        const showGhost = k === 0 && ghostFirst && !typed;
        return (
          <i key={k} className={showGhost ? "ghost" : undefined}>
            {typed[k] ?? (showGhost ? c : "")}
          </i>
        );
      })}
    </span>
  );
}
