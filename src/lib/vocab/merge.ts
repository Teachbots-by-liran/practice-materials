// Combines a student's progress from two places (this phone and the cloud, or two
// devices) without losing anything. Used both in the app and on the server.

import type { AnswerRecord, StudentProgress, WordState } from "./types";

function newerWord(a: WordState, b: WordState): WordState {
  const ka = `${a.lastReview ?? ""}|${String(a.reps).padStart(4, "0")}|${String(a.lapses).padStart(4, "0")}`;
  const kb = `${b.lastReview ?? ""}|${String(b.reps).padStart(4, "0")}|${String(b.lapses).padStart(4, "0")}`;
  const winner = kb > ka ? b : a;
  const other = winner === a ? b : a;
  return {
    ...winner,
    correctDays: [...new Set([...winner.correctDays, ...other.correctDays])].sort(),
    correctContexts: [...new Set([...winner.correctContexts, ...other.correctContexts])],
    produced: winner.produced || other.produced,
    seen: { ...other.seen, ...winner.seen },
    known: winner.known || other.known,
    introduced: winner.introduced < other.introduced ? winner.introduced : other.introduced,
  };
}

const answerKey = (a: AnswerRecord) => `${a.date}|${a.questionId}|${a.ms}|${a.correct}`;

function uniqueBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function mergeProgress(a: StudentProgress, b: StudentProgress): StudentProgress {
  const words: Record<string, WordState> = { ...a.words };
  for (const [w, s] of Object.entries(b.words)) words[w] = words[w] ? newerWord(words[w], s) : s;

  return {
    ...a,
    placementDone: a.placementDone || b.placementDone,
    placedLists: [...new Set([...(a.placedLists ?? []), ...(b.placedLists ?? [])])],
    xp: Math.max(a.xp, b.xp),
    activeDays: [...new Set([...a.activeDays, ...b.activeDays])].sort().slice(-120),
    words,
    answers: uniqueBy([...a.answers, ...b.answers], answerKey)
      .sort((x, y) => x.date.localeCompare(y.date))
      .slice(-400),
    sentences: uniqueBy([...a.sentences, ...b.sentences], (s) => `${s.word}|${s.text}`),
    flags: uniqueBy([...a.flags, ...b.flags], (f) => `${f.listId}|${f.questionId}`),
  };
}
