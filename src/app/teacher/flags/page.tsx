import { flaggedQuestions } from "@/lib/server/repo";
import { getStore } from "@/lib/server/store";
import type { Question } from "@/lib/vocab/types";
import { resolveFlagsAction, toggleHiddenAction } from "../actions";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  "wrong-answer": "The answer is wrong",
  "two-answers": "More than one answer fits",
  translation: "The translation is wrong",
  confusing: "It's confusing",
};

function QuestionView({ q }: { q: Question }) {
  const text = (s: string) => s.replace(/\{_\}/g, "____").replace(/[{}]/g, "");
  switch (q.type) {
    case "meaning":
      return (
        <p>
          Which word means “{q.prompt}”? Options: {q.options.join(", ")} · <b>Answer: {q.options[q.answer]}</b>
        </p>
      );
    case "cloze":
      return (
        <p>
          {text(q.sentence)} Options: {q.options.join(", ")} · <b>Answer: {q.options[q.answer]}</b>
        </p>
      );
    case "swipe":
      return (
        <p>
          {text(q.sentence)} · <b>{q.correct ? "Correct use" : "Wrong use"}</b> · {q.explain}
        </p>
      );
    case "chat":
      return (
        <p>
          {q.who}: “{q.them}” → “{text(q.me)}” · <b>Answer: {q.answer}</b>
          {q.alsoFits?.length ? ` · also fits: ${q.alsoFits.join(", ")}` : ""}
        </p>
      );
    case "family":
      return (
        <p>
          {text(q.sentence)} · <b>Answer: {q.answer}</b>
        </p>
      );
    case "pick":
      return (
        <ul className="list-disc pl-5">
          {q.options.map((o, i) => (
            <li key={i}>
              {text(o.text)} {o.correct ? "✓" : "✗"}
            </li>
          ))}
        </ul>
      );
  }
}

export default async function FlagsPage() {
  const store = getStore();
  const flagged = store ? await flaggedQuestions(store) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reported questions</h1>
        <p className="text-sm text-gray-500 mt-1">
          A question reported by two students is hidden automatically until you deal with it. To fix one, copy the request and paste it
          into Claude Code, then mark it as dealt with.
        </p>
      </div>
      {flagged.length === 0 && <p className="section-card text-sm text-gray-500">Nothing reported. 🎉</p>}
      {flagged.map((f) => {
        const reasons = Object.entries(f.reasons)
          .map(([r, n]) => `${REASONS[r] ?? r} (${n})`)
          .join(", ");
        const fixRequest = `In src/content/word-lists/${f.listId}.json, students reported question ${f.questionId} (word "${f.word}"): ${reasons}. Check it, fix or replace it, keep the same id, and run npm run check:words.\n\nThe question now:\n${JSON.stringify(f.question, null, 2)}`;
        return (
          <article key={`${f.listId}:${f.questionId}`} className="section-card space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-bold text-gray-900">{f.word}</h2>
              <span className="text-xs font-mono text-gray-500">{f.questionId}</span>
              <span className="text-sm text-gray-600">
                {f.reporters} {f.reporters === 1 ? "report" : "reports"}: {reasons}
              </span>
              {(f.hidden || f.reporters >= 2) && <span className="text-xs font-semibold text-orange-800 bg-orange-50 rounded px-2 py-0.5">Hidden from students</span>}
            </div>
            <div className="text-sm text-gray-800 bg-gray-50 rounded-xl p-3">{f.question ? <QuestionView q={f.question as Question} /> : "This question no longer exists."}</div>
            <div className="flex flex-wrap gap-3 text-sm">
              <CopyButton text={fixRequest} />
              <form action={toggleHiddenAction}>
                <input type="hidden" name="listId" value={f.listId} />
                <input type="hidden" name="questionId" value={f.questionId} />
                <input type="hidden" name="hide" value={f.hidden ? "0" : "1"} />
                <button className="rounded-xl border border-gray-300 font-semibold px-3 py-1.5 hover:bg-gray-50">{f.hidden ? "Show it again" : "Hide for everyone"}</button>
              </form>
              <form action={resolveFlagsAction}>
                {f.flagIds.map((id) => (
                  <input key={id} type="hidden" name="flagIds" value={id} />
                ))}
                <button className="rounded-xl bg-indigo-600 text-white font-semibold px-3 py-1.5 hover:bg-indigo-700">Mark as dealt with</button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
