// ── Word list content (generated once, stored as JSON) ─────────────

export type PartOfSpeech = "verb" | "noun" | "adjective" | "adverb";

export interface FamilyForm {
  form: string;
  pos: PartOfSpeech;
}

/** Sentences mark the target with {curly braces}; gaps are written as {_}. */
interface QuestionBase {
  id: string;
  /** "advanced" questions are for words the student already knew at placement. */
  level?: "core" | "advanced";
  /** For words with several meanings: which meaning this question practises. */
  sense?: string;
}

/** "Which word means …?" */
export interface MeaningQuestion extends QuestionBase {
  type: "meaning";
  prompt: string;
  options: string[];
  answer: number;
}

/** Sentence with a gap and 3–4 options. Also used for the boss round. */
export interface ClozeQuestion extends QuestionBase {
  type: "cloze";
  sentence: string;
  options: string[];
  answer: number;
  explain?: string;
}

/** "Is the word used correctly?" — swipe right / left. */
export interface SwipeQuestion extends QuestionBase {
  type: "swipe";
  sentence: string;
  correct: boolean;
  explain: string;
}

/** A friend's message and the student's reply with a gap. Typed or letter tiles. */
export interface ChatQuestion extends QuestionBase {
  type: "chat";
  who: string;
  them: string;
  me: string;
  answer: string;
  /** Other words that also fit the gap. Typing one gets "good English, try our word" instead of "wrong". */
  alsoFits?: string[];
}

/** Bagrut-style word family: "The ___ of the project (achieve)". */
export interface FamilyQuestion extends QuestionBase {
  type: "family";
  sentence: string;
  answer: string;
  hint: string;
}

/** "Pick all the sentences that use the word correctly." */
export interface PickQuestion extends QuestionBase {
  type: "pick";
  options: { text: string; correct: boolean }[];
  explain: string;
}

export type Question =
  | MeaningQuestion
  | ClozeQuestion
  | SwipeQuestion
  | ChatQuestion
  | FamilyQuestion
  | PickQuestion;

export type QuestionType = Question["type"];

export interface MeetCard {
  sentence: string;
  options: string[];
  answer: number;
}

export interface WordEntry {
  word: string;
  pos: PartOfSpeech;
  he: string;
  definition: string;
  family: FamilyForm[];
  /** Words students mix this one up with (affect/effect). Never introduced together. */
  confusables?: string[];
  /** Distinct meanings, for words that have more than one. */
  senses?: string[];
  meet: MeetCard;
  questions: Question[];
}

export interface WordList {
  id: string;
  title: string;
  words: WordEntry[];
}

// ── Student progress ───────────────────────────────────────────────

export type Stage = "new" | "learning" | "review" | "mastered";

export interface WordState {
  word: string;
  listId: string;
  stage: Stage;
  /** Marked as known in the placement check: gets harder questions, still practised. */
  known: boolean;
  /** Days until the next review. */
  interval: number;
  /** How fast the interval grows (1.3–2.8). Drops when the student struggles. */
  ease: number;
  due: string; // YYYY-MM-DD
  introduced: string; // YYYY-MM-DD
  lastReview: string | null;
  lastCorrect: boolean | null;
  reps: number;
  lapses: number;
  hints: number;
  /** Distinct days with an unaided correct recall (successive relearning). */
  correctDays: string[];
  /** Question ids answered correctly (distinct contexts). */
  correctContexts: string[];
  /** Produced the word (typed or tiles) correctly without a hint at least once. */
  produced: boolean;
  /** Question id → last day it was shown, for rotating contexts. */
  seen: Record<string, string>;
}

export interface WrittenSentence {
  word: string;
  listId: string;
  text: string;
  date: string;
}

export interface AnswerRecord {
  date: string;
  word: string;
  questionId: string;
  correct: boolean;
  hinted: boolean;
  tooFast: boolean;
  ms: number;
}

export type Pace = "steady" | "normal" | "boost";

export interface StudentProgress {
  version: 1;
  name: string;
  listId: string;
  placementDone: boolean;
  weeklyGoal: number;
  pace: Pace;
  xp: number;
  activeDays: string[];
  words: Record<string, WordState>;
  answers: AnswerRecord[];
  sentences: WrittenSentence[];
  settings: { sound: boolean };
}
