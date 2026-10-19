import type { AnswerFormat } from "@/lib/vocab/scheduler";

/** What a question screen reports back to the session. */
export interface AnswerResult {
  correct: boolean;
  hinted: boolean;
  /** Time from the answers unlocking to the answer. */
  ms: number;
  /** Characters the student had to read; used to spot answers too fast to be real. */
  chars: number;
  /** Position of the chosen option on screen, for multiple choice. */
  choice?: number;
  format: AnswerFormat;
  production: boolean;
  /** Typed answer with a small spelling mistake, counted correct. */
  typo?: boolean;
  correctText?: string;
  explain?: string;
}
