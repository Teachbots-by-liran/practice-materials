// Detects blind guessing and tells the student directly.
// A too-fast answer earns nothing and its word comes back.

export interface AnswerSignal {
  ms: number;
  /** Characters the student had to read before answering. */
  chars: number;
  correct: boolean;
  /** Position of the chosen option, for multiple-choice answers. */
  choice?: number;
  inBoss?: boolean;
}

export interface GuessVerdict {
  tooFast: boolean;
  message: string | null;
  /** Lock the answer buttons this long on the next few questions. */
  lockMs: number;
}

/** 50 characters per second is fast skimming; anything quicker can't have been read. */
export function minReadMs(chars: number): number {
  return Math.max(600, chars * 20);
}

export class GuessMonitor {
  private fastStreak = 0;
  private lockLeft = 0;
  private choices: number[] = [];

  record(a: AnswerSignal): GuessVerdict {
    const tooFast = a.ms < minReadMs(a.chars);
    let message: string | null = null;

    if (tooFast) {
      this.fastStreak++;
      const secs = (a.ms / 1000).toFixed(1);
      if (a.inBoss) message = "Too fast to have read it! ❤️ lost";
      else if (this.fastStreak >= 3) {
        message = `${this.fastStreak} quick guesses. They don't count, and those words are coming back.`;
        this.lockLeft = 3;
      } else message = `${secs} seconds? You didn't even read that one 👀`;
    } else {
      this.fastStreak = 0;
    }

    if (a.choice !== undefined) {
      this.choices.push(a.choice);
      if (this.choices.length > 5) this.choices.shift();
      const samePlace = this.choices.length === 5 && this.choices.every((c) => c === this.choices[0]);
      if (samePlace && !message) {
        message = `${["Top", "Second", "Third", "Bottom"][this.choices[0]] ?? "Same"} answer every time? Nice try 😄`;
        this.choices = [];
      }
    }

    let lockMs = 0;
    if (this.lockLeft > 0 && !tooFast) this.lockLeft--;
    if (this.lockLeft > 0) lockMs = 2000;
    return { tooFast, message, lockMs };
  }

  /** Lock to apply to the question being shown now. */
  get currentLockMs(): number {
    return this.lockLeft > 0 ? 2000 : 0;
  }
}
