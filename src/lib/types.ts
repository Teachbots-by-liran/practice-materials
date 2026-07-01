export type Module = "E" | "G";

export type TextType =
  | "article"
  | "interview"
  | "letter"
  | "report"
  | "review"
  | "personal_account"
  | "informative";

export type InferenceLevel = "low" | "mid" | "high";
export type DistractorLevel = "tight" | "loose";

export interface ToggleState {
  inference: InferenceLevel;
  distractors: DistractorLevel;
  authentic: boolean;
  parallel: boolean;
  glossary: boolean;
  scaffold: boolean;
}

export interface GeneratorInput {
  module: Module;
  topic: string;
  textType: TextType;
  languageStructures: string;
  sources: string;
  toggles: ToggleState;
  deltaText?: string;
  isDeltaMode: boolean;
}

export interface ParsedOutput {
  unseenText: string;
  taskSheet: string;
  glossary: string;
  answerKey: string;
  writingPrompt: string;
  versionB: string;
}

export const TEXT_TYPE_LABELS: Record<TextType, string> = {
  article: "Article",
  interview: "Interview",
  letter: "Letter",
  report: "Report",
  review: "Review",
  personal_account: "Personal Account",
  informative: "Informative Text",
};

export const DEFAULT_TOGGLES: ToggleState = {
  inference: "mid",
  distractors: "tight",
  authentic: true,
  parallel: false,
  glossary: true,
  scaffold: false,
};
