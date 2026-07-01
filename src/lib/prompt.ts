import type { GeneratorInput } from "./types";
import { getRandomWords } from "./bandIII";

function inferenceInstruction(level: string): string {
  if (level === "low")
    return "At least 70% of comprehension questions should test literal understanding directly stated in the text. Max 30% inferential.";
  if (level === "high")
    return "At least 60% of comprehension questions should require inference, reading between the lines, or evaluative thinking. Keep literal questions to a minimum.";
  return "Balance questions: approximately 40% literal, 40% inferential, 20% evaluative/critical thinking.";
}

function distractorInstruction(level: string): string {
  if (level === "loose")
    return "MCQ distractors should be clearly incorrect — plausible to a careless reader but obviously wrong on careful reading.";
  return "MCQ distractors should be genuinely challenging — each distractor should seem plausible and require careful reading to eliminate. Avoid obviously wrong options.";
}

export function buildSystemPrompt(): string {
  return `You are an expert Israeli Bagrut exam creator specialising in English reading comprehension for Modules E and G of the 5-point Bagrut. You have deep knowledge of the official 2025 Israeli Ministry of Education Bagrut specifications.

Your output must use EXACTLY these section markers (each heading on its own line, in this order). Include only sections that apply:

## UNSEEN TEXT
## TASK SHEET
## GLOSSARY
## ANSWER KEY
## WRITING PROMPT
## VERSION B

Rules:
- Never omit the ## UNSEEN TEXT, ## TASK SHEET, or ## ANSWER KEY markers.
- Leave a blank line after each ## heading before the content begins.
- Do not add any text outside these sections.

For Module E, the ## TASK SHEET must follow this EXACT structure:

PART I: WRITTEN RECEPTION (70 points)
(ACCESS TO INFORMATION FROM WRITTEN TEXTS)

Read the article below and then answer questions 1–9.
A glossary of the underlined words (numbers 1–[N]) is provided on the next page.

QUESTIONS (70 points)
Answer questions 1–9 in English according to the article. In questions [list the 4 MCQ question numbers separated by commas], circle the number of the correct answer. In the other questions, follow the instructions.

[Questions 1–9 as a straight numbered list — NO task groupings]

---

PART II: LEXICAL KNOWLEDGE (30 points)
(VOCABULARY)

Below are five questions, (10) to (14). In each question there are six items (words or chunks) and three definitions.
In each question, match three of the items 1–6 to the definitions on the right.
Write the number of the item next to its definition, as shown in the example.
(2 points for each correct match.)

[Questions 10–14]

The ## ANSWER KEY must mirror this structure exactly: Part I then Part II, each question number with model answer and a brief marking note.
For vocabulary questions (10)–(14), use EXACTLY this format: (10) A=N B=N C=N (where N is the item number 1–6).`;
}

export function buildUserPrompt(input: GeneratorInput): string {
  const {
    module,
    topic,
    textType,
    languageStructures,
    sources,
    toggles,
    deltaText,
    isDeltaMode,
  } = input;

  const isModuleE = module === "E";
  const wordCount = isModuleE
    ? "up to 350 words"
    : "450–500 words (strictly within this range)";
  const cefrLevel = isModuleE
    ? "CEFR B1–B2 (Independent User I) — accessible for strong B1 students"
    : "CEFR B2–C1 (Independent User II) — challenging but fair for advanced students";

  const textFormatRules = `
TEXT FORMAT — follow exactly:
- Divide the text into 4–5 paragraphs. Open each paragraph with a bold Roman numeral heading on its own line: **I**, **II**, **III**, **IV**, **V**.
- Add a line number at the start of every 5th line (lines 5, 10, 15, 20, 25). Left-align the number before the text on that line, e.g. "5   Local authorities have begun…"
- Pick 4–8 words or short phrases that advanced B1 students may not know. Underline each one and add a superscript number (Unicode: ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸) in order of first appearance. These become the GLOSSARY entries.
  Example: "Local authorities have begun to restore¹ the damaged wetlands, using a method²…"`;

  const moduleEComprehension = `
PART I — COMPREHENSION QUESTIONS (70 points total):

Write exactly 9 questions numbered 1 to 9. Do NOT group them into tasks — just a straight numbered list. Choose EXACTLY 4 of the 9 to be MCQ questions (pick the positions yourself). The remaining 5 are non-MCQ.

MCQ format:
[N]. [Question referencing a specific paragraph or line range — e.g. "What do we learn from paragraph II about X?" / "What are we told about X in lines 10–13?"]
  i)   [option]
  ii)  [option]
  iii) [option]
  iv)  [option]
([points] points)

Non-MCQ formats — use a MIX of Type A and Type B (mostly Type A, 1–2 Type B per exam):

Type A — Sentence completion:
[N]. [Context or instruction — what to find and where. e.g. "Give ONE possible result of floods described in paragraph I." / "According to paragraph II, why do cities use new road materials?" / "What do we learn from lines 14–16 about solar energy?"]
[Optional: Base your answer on paragraph X. / Base your answer on lines X–Y.]
COMPLETE THE ANSWER.
[Short sentence stem the student finishes — starts mid-thought, ends with dots. e.g. "Floods can ...................." / "Because water ...................." / "In order to ...................." / "By ...................."]
([points] points)

Type B — Short factual answer:
[N]. [The question itself — asks for a specific name, place, number, or fact. Include paragraph or line reference in brackets. e.g. "In which city have rain gardens been planted? (paragraph IV)" / "Name ONE country mentioned in paragraph II." / "How many people were affected? (lines 18–20)"]
ANSWER: ..............................................
([points] points)

Question content rules:
- Questions must progress through the text in order: early questions cover early paragraphs, later questions cover later paragraphs.
- Every question must reference a specific paragraph number or line range where the answer is found.
- ${inferenceInstruction(toggles.inference)}
- ${distractorInstruction(toggles.distractors)}
- Point values: use (8 points) for most questions, (7 points) for 1–2 simpler ones. Total must equal EXACTLY 70.
- The instruction line at the top of the QUESTIONS block must list the exact numbers of the 4 MCQ questions (e.g. "In questions 1, 3, 7, and 9, circle the number of the correct answer.").`;

  // Randomly select Band III words for each vocab question
  const vocabWords = {
    verbs: getRandomWords("verbs", 6),
    nouns: getRandomWords("nouns", 6),
    adjectives: getRandomWords("adjectives", 6),
    adverbs: getRandomWords("adverbs", 6),
    chunks: getRandomWords("chunks", 6),
  };

  const fmtVerbs = vocabWords.verbs.map((w, i) => `${i + 1}. to ${w}`).join("\n");
  const fmtNouns = vocabWords.nouns.map((w, i) => `${i + 1}. ${w}`).join("\n");
  const fmtAdj   = vocabWords.adjectives.map((w, i) => `${i + 1}. ${w}`).join("\n");
  const fmtAdv   = vocabWords.adverbs.map((w, i) => `${i + 1}. ${w}`).join("\n");
  const fmtChunk = vocabWords.chunks.map((w, i) => `${i + 1}. ${w}`).join("\n");

  const moduleEVocab = `
PART II — LEXICAL KNOWLEDGE (30 points total):

Write exactly 5 vocabulary questions numbered (10) to (14). Use EXACTLY the words provided below — do not substitute, add, or remove any words.

For each question, format EXACTLY like this example:
(10) VERBS
1. to [verb]
2. to [verb]
…
6. to [verb]

A. ________ [simple definition]
B. ________ [definition]
C. ________ [definition]

(2 points for each correct match)

Rules:
- Use EXACTLY the words listed below for each question.
- Exactly 3 of the 6 items must match the 3 definitions. The other 3 are plausible distractors with no definition.
- Definitions must be simple English paraphrases — not one-word synonyms.
- Shuffle items so matching words are NOT adjacent to their definitions.
- Do NOT reuse words from the reading text.
- Total: 2 pts × 3 matches × 5 questions = 30 pts.

WORDS TO USE (mandatory):

(10) VERBS — use these 6 in infinitive form (to ____):
${fmtVerbs}

(11) NOUNS — use these 6:
${fmtNouns}

(12) ADJECTIVES — use these 6:
${fmtAdj}

(13) ADVERBS — use these 6 (all end in -ly):
${fmtAdv}

(14) MULTI-WORD CHUNKS — use these 6 phrases/expressions:
${fmtChunk}

ANSWER KEY FORMAT FOR VOCAB (strictly follow this format in the ## ANSWER KEY section):
(10) A=N B=N C=N
(11) A=N B=N C=N
(12) A=N B=N C=N
(13) A=N B=N C=N
(14) A=N B=N C=N
Where N is the item number (1–6) that matches the definition.`;

  const moduleGWriting = `WRITING TASK (40 points): Generate a ## WRITING PROMPT section with a clear writing task (opinion essay, for/against, description, email, formal letter, or story) thematically linked to the text. Students must write 120–140 words. State the task clearly, state the word count, and give 2–3 bullet-point content guidance hints.`;

  const structureSection = languageStructures
    ? `\nEMBED these language structures naturally in the text (do not make them feel forced):\n${languageStructures}`
    : "";

  const sourcesSection = sources
    ? `\nINCORPORATE or draw on these sources/references (quotes, cultural references, or topic material):\n${sources}`
    : "";

  const glossaryInstruction = `
GLOSSARY (## GLOSSARY section):
List each underlined word or phrase from the text in numbered order. Format each entry as:
1. [word or phrase] — [contextual meaning: how the word is used IN THIS TEXT, 4–8 words, plain English]
2. [word or phrase] — [contextual meaning]
…
IMPORTANT: Give contextual paraphrases, not dictionary definitions. The meaning must match how the word is used in the passage. Example: if "restore" means "bring back to normal" in context, write "bring back to original condition" — not a generic definition.
Numbers must match the superscripts in the text exactly. Always include this section.`;

  const parallelInstruction = toggles.parallel
    ? `\nPARALLEL VERSIONS: After the ## ANSWER KEY, add a ## VERSION B section containing a complete alternative version of the text on the same topic (same word count, same CEFR level), a reworded task sheet, and an answer key for that version. Mark it clearly as VERSION B throughout.`
    : "";

  const authenticInstruction = toggles.authentic
    ? `\nAUTHENTIC REGISTER: Write the text so it reads like genuine published writing — a real magazine article or news report. Avoid pedagogical-sounding language. Use natural transitions, varied sentence rhythm, and a genuine authorial voice.`
    : `\nPEDAGOGICAL REGISTER: Write the text with clarity and controlled vocabulary typical of EFL reading materials. Ensure key ideas are clearly signposted and accessible.`;

  if (isDeltaMode && deltaText) {
    return `DELTA MODE: The teacher has pasted in an existing text. Retrofit it with Bagrut Module ${module} tasks without modifying the text itself.

EXISTING TEXT:
${deltaText}

---
Module: ${module}
${cefrLevel}

${isModuleE
  ? moduleEComprehension
  : `READING COMPREHENSION (60 points):\n${inferenceInstruction(toggles.inference)}\n${distractorInstruction(toggles.distractors)}`}

${isModuleE ? moduleEVocab : moduleGWriting}
${glossaryInstruction}
${parallelInstruction}`;
  }

  return `Generate a complete Bagrut Module ${module} unseen exam on the following topic.

TOPIC: ${topic}
TEXT TYPE: ${textType.replace("_", " ")}
TEXT LENGTH: ${wordCount}
LANGUAGE LEVEL: ${cefrLevel}${structureSection}${sourcesSection}
${authenticInstruction}
${textFormatRules}

${isModuleE
  ? moduleEComprehension
  : `READING COMPREHENSION (60 points):\nTotal comprehension questions: 8–10.\n${inferenceInstruction(toggles.inference)}\n${distractorInstruction(toggles.distractors)}`}

${isModuleE ? moduleEVocab : moduleGWriting}
${glossaryInstruction}
${parallelInstruction}

CULTURAL REGISTER: Keep content globally relatable for Israeli high schoolers aged 16–18. Avoid culturally specific references they would not know.

Begin with ## UNSEEN TEXT.`;
}

export function parseOutput(raw: string): {
  unseenText: string;
  taskSheet: string;
  glossary: string;
  answerKey: string;
  writingPrompt: string;
  versionB: string;
} {
  const sections = {
    unseenText: "",
    taskSheet: "",
    glossary: "",
    answerKey: "",
    writingPrompt: "",
    versionB: "",
  };

  const markers = [
    { key: "unseenText", marker: "## UNSEEN TEXT" },
    { key: "taskSheet", marker: "## TASK SHEET" },
    { key: "glossary", marker: "## GLOSSARY" },
    { key: "answerKey", marker: "## ANSWER KEY" },
    { key: "writingPrompt", marker: "## WRITING PROMPT" },
    { key: "versionB", marker: "## VERSION B" },
  ] as const;

  const positions: { key: string; start: number }[] = [];

  for (const { key, marker } of markers) {
    const idx = raw.indexOf(marker);
    if (idx !== -1) positions.push({ key, start: idx + marker.length });
  }

  positions.sort((a, b) => a.start - b.start);

  for (let i = 0; i < positions.length; i++) {
    const { key, start } = positions[i];
    const end =
      i + 1 < positions.length
        ? positions[i + 1].start -
          markers.find((m) => m.key === positions[i + 1].key)!.marker.length
        : raw.length;
    sections[key as keyof typeof sections] = raw.slice(start, end).trim();
  }

  return sections;
}
