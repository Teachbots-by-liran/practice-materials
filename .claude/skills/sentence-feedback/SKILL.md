---
name: sentence-feedback
description: Give feedback on the sentences Word Quest students wrote with their vocabulary words. Use when the teacher shares or points to a student-sentences export (.md from the teacher portal's "Download for Claude"), or asks for feedback on students' sentences.
---

# Feedback on students' own sentences

The teacher downloads the export from the class page in the Word Quest portal
(**Students' own sentences → Download for Claude**). It's a Markdown file: one section per
student, each line `- **word** · date · sentence`.

## Steps

1. Get the file: ask for its path (usually in Downloads, named `student-sentences-YYYY-MM-DD.md`)
   or use the text the teacher pasted. Read all of it before writing anything.
2. For **every sentence**, decide:
   - ✅ **Correct and natural**: the target word is used with the right meaning, form and collocation.
   - 🟡 **Understandable but off**: wrong form (achieve/achievement), wrong collocation
     (*make an achievement*), unnatural or too vague ("I want to achieve something great").
   - ❌ **Wrong meaning**: the word doesn't mean what the student thinks.
   Grammar mistakes that aren't about the target word are worth one short note at most;
   the focus is the vocabulary.
3. Write the report (below) as a Markdown file next to the export:
   `student-sentences-YYYY-MM-DD-feedback.md`. Tell the teacher where it is and give a
   3–5 line summary in chat.

## Report format

```markdown
# Sentence feedback · <class> · <date>

## The big picture
- <N> sentences from <M> students: <a> correct, <b> almost, <c> wrong meaning.
- The most common problems, with how many students had each.

## Mini-lesson idea (10 minutes)
The most common problem, explained simply, with 3 correct example sentences and
a quick in-class activity.

## Words to reteach
| Word | What went wrong | Students |

## Per student
### <name>
- ✅/🟡/❌ **word**: "<their sentence>" → <corrected or better version> · <one-line why>
```

## Tone and rules

- Write for the **teacher**, in clear English. Corrections are short enough to read aloud or copy
  into a message to the student.
- Be specific: always give the corrected sentence, not just "wrong".
- Sentences that only copy the template ("I really want to <word> something…") or don't show
  the meaning count as 🟡 with the note "doesn't show the meaning yet"; mention in the big
  picture if many students do this.
- Never invent sentences that aren't in the file, and don't judge students; judge sentences.
- If a sentence contains personal or sensitive information, don't repeat it in the report;
  write "(personal sentence, skipped)" and tell the teacher privately in chat.
