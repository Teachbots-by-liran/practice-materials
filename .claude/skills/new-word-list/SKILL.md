---
name: new-word-list
description: Generate a Word Quest vocabulary list (questions, chats, word families, Hebrew) from a list of English words, check it, and add it to the app. Use when the teacher gives a list of words to add, or asks to extend or fix a word list.
---

# New Word Quest word list

The teacher gives you English words (pasted, a file, or "Band III words N–M" from `src/lib/bandIII.ts`).
You write the practice content for every word as JSON, check it, and register the list.
Content is generated once here, on the teacher's Claude plan; the app never calls Claude.

## Steps

1. **Agree the list**: the id (lowercase-dashes, e.g. `band3-unit2`), a title students will see
   (e.g. "Band III · Unit 2"), and the words. If more than ~25 words, work in batches of ~20 and
   append to the same file, running the check after each batch.
2. **Write** `src/content/word-lists/<id>.json` following the format in `src/lib/vocab/types.ts`
   (`WordList`). Use `src/content/word-lists/band3-starter.json` as the model for tone and length.
3. **Check**: `npm run check:words`. Fix every problem it reports and run it again until it passes.
4. **Review your own work** against the quality rules below. The checker can't judge meaning.
   Re-read every gap sentence and ask: could a different common word fit here? If so, rewrite
   the sentence or add that word to `alsoFits` (chat questions).
5. **Register** the list in `src/lib/vocab/lists.ts` (import + add to `WORD_LISTS`).
6. Run `npm test`, then tell the teacher how many words and questions were added, and anything
   you weren't sure about (e.g. a word with a meaning you left out).

## What each word needs

| Field | Rule |
|---|---|
| `he` | Natural Hebrew a teacher would write on the board. Several meanings separated by `;`. |
| `definition` | Learner-dictionary English, under ~15 words, no harder words than the target. |
| `family` | Real, common forms only (achievement, achievable). `[]` if none worth teaching. |
| `confusables` | Words students mix it up with (affect→effect, adapt→adopt). |
| `senses` | Only for words with 2+ common meanings at this level (address, conduct, maintain). |
| `meet` | A sentence that makes the meaning guessable, and 3 short guess options. |

Questions (ids `<word>-1`, `<word>-2`, …):

- **Core questions**: at least 5 (at least 8 with 2+ senses, each sense ≥ 2 questions, tagged `sense`).
  At least 1 `meaning`, 1 `cloze`, 2 `chat`, 1 `swipe` (one true and one false is best),
  1 `family` if the word has a family, and a `pick` for words with tricky collocations.
- **Advanced questions** (`"level": "advanced"`), at least 1: for students who already know the word.
  Less common meanings, collocations, the confusable word, or a family form in a harder sentence.
- Words with many uses get more questions (up to ~12), spread across meanings and collocations.

## Quality rules

- **One word fits.** Each gap must make the target the only natural answer among the options,
  and, for `chat`, the clearly best answer overall. Synonyms that also fit go in `alsoFits`.
- **Distractors** are other words from the same list, in the same grammatical form as the answer,
  that are clearly wrong in that sentence. Never a distractor that is also correct.
- **Wrong swipe sentences** use the word where a common everyday verb or noun belongs
  ("He achieved the bus"), so the mistake is obvious once you know the meaning. The `explain`
  says what the right word would be.
- **Contexts students care about**: school, friends, family, sport, phones, trips, the army,
  part-time jobs, Israeli settings and names (Noa, Itay, Shira, Yoav, Adi…). Chat messages
  sound like real WhatsApp messages from a 16-year-old: short, casual, an emoji at most.
- **Every sentence is different.** No two questions share a sentence, even across words.
- Sentences are at Band III level: no word harder than the target unless the context explains it.
- Mark the target in sentences with `{curly braces}`, gaps with `{_}`.
