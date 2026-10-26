# DEMO UNIT: deploy on Vercel

1. **Database.** Create a Postgres database (Neon, Supabase or Vercel Postgres).
   Open its SQL editor and run `db/schema.sql` once.
2. **Environment variables** (Vercel > Project > Settings > Environment Variables):
   - `DATABASE_URL`: your Postgres connection string
   - `JWT_SECRET`: a random string, 32+ characters
   - `LATE_LOG_HOURS`: hours allowed between arrest and logging (placeholder is 2, confirm the real rule)
3. **Deploy.** Push this folder to Git and import it in Vercel (Framework: Other), or run `vercel` in this folder.
4. **First officer account.** On your computer, in this folder:
   `npm install`
   `DATABASE_URL="..." npm run create-user -- ID123 "a-long-password" "Gulshan Police Station" "Dhaka"`
   Repeat for each officer. There is no sign-up page: accounts are created here.

Endpoints: `POST /api/login`, `POST /api/logout`, `GET /api/search` (public),
`POST /api/arrests` and `POST /api/medical` (police login required).
