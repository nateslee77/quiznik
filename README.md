# Quiznik

A minimal Quizlet-style flashcard app: create sets by typing cards manually or
pasting text, study them with a flip-card deck, and take an auto-generated
multiple-choice test. Every set is tied to your account.

- **Framework:** Next.js 16 (App Router, Server Actions)
- **Auth + DB:** Supabase (email/password auth, Postgres with Row Level Security)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql). This creates
   `sets` and `cards` tables with Row Level Security policies so each user can
   only see and modify their own data.
3. In **Project Settings → API**, copy the **Project URL** and the **anon
   public** key.
4. In **Authentication → Providers**, email/password sign-up is enabled by
   default. If you want new accounts to skip email confirmation during local
   testing, turn off "Confirm email" under **Authentication → Sign In / Providers → Email**.

## 2. Local development

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 3. Deploy to Vercel

1. Push this repo to GitHub (already at `github.com/nateslee77/quiznik`).
2. In Vercel, "Add New Project" → import the repo.
3. Add the same two environment variables from `.env.local` in the Vercel
   project's **Settings → Environment Variables**.
4. In Supabase, under **Authentication → URL Configuration**, add your Vercel
   deployment URL (and `http://localhost:3000` for local dev) to the **Site
   URL** / **Redirect URLs** so email confirmation links redirect correctly to
   `/auth/callback`.
5. Deploy.

## How it's organized

| Path | What it does |
|---|---|
| `supabase/schema.sql` | Tables (`sets`, `cards`) + RLS policies |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Component / Server Action Supabase client |
| `src/lib/supabase/proxy.ts` | Session-refresh logic used by `src/proxy.ts` |
| `src/proxy.ts` | Next.js Proxy (runs on every request) — refreshes the auth session and gates protected routes |
| `src/app/login`, `src/app/signup` | Auth pages |
| `src/app/auth/actions.ts` | Sign in / sign up / sign out Server Actions |
| `src/app/auth/callback` | Handles Supabase email-confirmation redirects |
| `src/app/sets` | Dashboard, create-set flow, and per-set actions (CRUD) |
| `src/app/sets/[id]/study` | Flip-card study mode |
| `src/app/sets/[id]/test` | Auto-generated multiple-choice test |
| `src/lib/parseFlashcards.ts` | Paste-text → flashcards parser (tab/comma/dash/colon delimited) |
| `src/lib/generateQuiz.ts` | Builds multiple-choice questions from a set's cards |

## MVP scope

Included: email/password auth, create sets (manual entry + paste-to-import),
edit/delete cards and sets, flip-card study mode, multiple-choice test mode
with a results/review screen, mobile-first responsive UI, per-account
persistence via Supabase RLS.

Not included yet (future ideas): OAuth login, set sharing/collaboration,
spaced repetition, AI-assisted flashcard generation, drag-to-reorder cards,
true/false and typed-answer question types.
