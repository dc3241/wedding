# DEMO-04 — purge-demo Edge Function (manual deploy)

pg_cron is **not** enabled on this project. Cleanup runs via this scheduled Edge Function.

## 1. Paste migration first

Hand-paste `supabase/migrations/0073_demo_cleanup.sql` in the SQL editor and confirm:

```sql
select to_regprocedure('public.purge_demo_accounts()');
select to_regprocedure('public.purge_demo_auth_users()');
select to_regprocedure('public.try_record_demo_start(text)');
```

## 2. Checkpoint the two purge functions (before any schedule)

```sql
-- Age a throwaway is_demo account, then:
select purge_demo_accounts();  -- expect 1+; spot-check guests/tasks/vendors gone
-- Confirm is_demo_template rows untouched.

-- Age an orphaned anonymous auth.users row (no account_members), then:
select purge_demo_auth_users();  -- expect 1+; template/real users untouched
```

## 3. Deploy the function

From the repo root (linked Supabase CLI):

```bash
supabase functions deploy purge-demo --no-verify-jwt
```

`--no-verify-jwt` is intentional: the function checks `Authorization: Bearer <service_role>` itself so Dashboard schedules (which inject the service role) and curl both work. Do **not** leave it callable without that bearer.

## 4. One-shot invoke (no schedule yet)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/purge-demo" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expect JSON like `{ "ok": true, "accounts_deleted": N, "auth_users_deleted": M }`.

## 5. Schedule (only after checkpoints pass)

Dashboard → Edge Functions → **purge-demo** → Schedules → add hourly cron:

```
0 * * * *
```

Do not enable a live schedule until steps 1–4 succeed.
