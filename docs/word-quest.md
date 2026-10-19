# Word Quest: setup and everyday use

Word Quest is the vocabulary practice app for students (`/word-quest`, made for phones)
and its teacher portal (`/teacher`). It runs without any Claude API key.

## Try it on your computer

1. `npm install`, then `npm run dev`.
2. Student app: <http://localhost:3000/word-quest>. On your phone (same Wi‑Fi), use the
   "Network" address that `npm run dev` prints, e.g. `http://192.168.1.20:3000/word-quest`.
3. Teacher portal: <http://localhost:3000/teacher>. The password is `TEACHER_PASSWORD`
   in `.env.local`.

Without Supabase keys, class data is saved in `.data/word-quest-dev.json` on this computer.
That's for trying things out only.

## Going live (one-time setup)

1. **Supabase** (free): create a project at supabase.com. In **SQL Editor**, paste the contents
   of `supabase/schema.sql` and press **Run**.
2. In Supabase **Project Settings → API**, copy the **Project URL** and the **service_role** key.
   The service_role key is a secret: only put it in Vercel, never in the code or in a chat.
3. **Vercel → Project → Settings → Environment Variables**, add:

   | Name | Value |
   |---|---|
   | `TEACHER_PASSWORD` | a long password for you |
   | `SESSION_SECRET` | any long random text (32+ characters) |
   | `SUPABASE_URL` | the Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |

   Add `TEACHER_PASSWORD` and `SESSION_SECRET` **before** deploying: the Bagrut generator
   now asks for the teacher password too, and you can't sign in until it's set.
4. Merge the `word-quest` branch and deploy.

If Supabase pauses the project after a quiet week, open the Supabase dashboard and press
**Restore**. In the meantime students see an "offline" note and keep practising on their
phones; progress syncs once it's back. (New students can't join until then.)

## Running a class

1. **Classes → New class** gives you a code like `XMT-3392`.
2. Students open `/word-quest` on their phones, tap **Join my class**, and enter the code,
   a name and a 4-digit PIN. The same name and PIN bring their progress back on any phone.
   Forgotten PIN: reset it on the student's page.
3. On the class page, **Assign a word list**: the main list, a different list for a group
   (*Replace*), or extra ⭐ words for some students (*Add-on*). A **challenge list** unlocks
   by itself once a student has mastered 70% of the main list.
4. Check the class page a couple of times a week: **Needs attention** shows who stopped
   practising, who's rushing (answering too fast to read) and who's below 60% accuracy.
   Tick hard words to put them in everyone's boss round for a week.

## Adding word lists

In Claude Code, in this project, type `/new-word-list` and give it the words (or "Band III
nouns 21–40"). It writes the questions, checks them (`npm run check:words`) and adds the list.
Commit and deploy, and the list appears in the portal's list menu. This uses your Claude plan,
not the API.

## Reported questions

Students tap 🚩 **Report** on a question that looks wrong. A question reported by two students
is hidden automatically. In **Reported questions**, press **Copy fix request for Claude**,
paste it into Claude Code, then **Mark as dealt with** once the fix is deployed.

## Feedback on students' sentences

Students sometimes write their own sentence with a word (bonus XP). On the class page,
**Students' own sentences → Download for Claude** gives you a file. In Claude Code, type
`/sentence-feedback` and point it to the file: you get per-student corrections, the most
common mistakes, and a 10-minute mini-lesson idea.
