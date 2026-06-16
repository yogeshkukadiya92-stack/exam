# Exam Platform — Setup Guide (Phase 1)

Aa Phase 1 che: **Foundation** — database, auth, ane role-based routing taiyar che.

---

## Step 1 — Supabase Project banavo
1. https://supabase.com par jao → **New Project**
2. Project banya pachi: **SQL Editor** kholo
3. `supabase/schema.sql` file no badho code copy kari ne run karo (Run)
4. Pachi `supabase/phase4.sql` pan run karo (student exam flow na secure RPC functions)
5. Pachi `supabase/phase5.sql` run karo (analytics function)
6. Pachi `supabase/phase6.sql` run karo (proctoring column)
7. Pachi `supabase/phase7.sql` run karo (settings + announcements + teacher scoping)
8. Pachi `supabase/phase8.sql` run karo (auth profile trigger hardening)
9. Pachi `supabase/phase9.sql` run karo (question bank + advanced exam features)
10. Aa badha tables + RLS policies + functions banai dese

## Step 2 — Project local ma setup
```bash
# aa folder ma
npm install
```

## Step 3 — Environment variables
1. `.env.local.example` ne copy kari ne `.env.local` banavo:
   ```bash
   cp .env.local.example .env.local
   ```
2. Supabase ma: **Project Settings → API** mathi value lo:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key (bulk student import mate jaruri — aa SECRET che, kyare frontend ma na vaaparta)

## Step 4 — Email confirmation band karo (testing mate)
Supabase → **Authentication → Sign In / Providers → Email**
→ "Confirm email" ne **OFF** karo (testing ma saral pade; production ma pachi on karjo)

## Step 5 — App chalavo
```bash
npm run dev
```
→ http://localhost:3000 kholo

## Step 6 — Pehlo admin banavo
1. App ma **Signup** karo (aa student tarike banse)
2. Supabase → **SQL Editor** ma aa run karo (tamaro email nakho):
   ```sql
   update profiles set role = 'super_admin' where email = 'you@email.com';
   ```
3. Have logout → login karo → tame **Admin Dashboard** par pahochso 🎉

---

## Folder Structure
```
exam-platform/
├── app/
│   ├── (auth)/
│   │   ├── actions.ts        # login / signup / logout
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── admin/page.tsx        # admin dashboard (protected)
│   ├── student/page.tsx      # student dashboard (protected)
│   ├── layout.tsx
│   ├── page.tsx              # role pramane redirect
│   └── globals.css
├── lib/
│   ├── auth.ts               # getProfile / requireAdmin / requireStudent
│   └── supabase/
│       ├── client.ts         # browser client
│       └── server.ts         # server client
├── middleware.ts             # session refresh + route protection
├── supabase/schema.sql       # database schema + RLS
└── ...config files
```

---

## Su kaam kare che (Phase 1–5)
- ✅ Signup / Login / Logout + role-based access + protected routes
- ✅ Database + RLS + secure RPC functions
- ✅ Admin: Course / Batch / Exam create + manual MCQ questions
- ✅ Exam settings: timer, pass marks, negative marking, shuffle, publish
- ✅ Excel bulk question upload + bulk student import
- ✅ Student exam flow: instructions → timer → palette → mark review →
  auto-save → submit, resume support
- ✅ Auto-grading (negative marking, server-side secure)
- ✅ Result + review (correct answers + explanation)
- ✅ **Admin analytics**: summary, score distribution, hardest questions, leaderboard
- ✅ **Excel export** of results + **PDF marksheet** (student)
- ✅ **Anti-cheat** (proctoring): tab-switch detection + auto-submit, copy-paste disable
- ✅ **Question shuffle** (per-student stable order)
- ✅ **Certificate** download (pass thaya pachi)

## Optional next (Phase 7+)
Sections, bilingual questions, email notifications, webcam proctoring,
multi-role admin. Aa badha "nice-to-have" che — core platform complete che.
