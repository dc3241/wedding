# PRICE-04 — charge-trial-balance Edge Function (manual deploy)

pg_cron is **not** enabled on this project. Day-7 couple charges run via this
scheduled Edge Function (sibling of `purge-demo`).

## 1. Paste migration first

Hand-paste `supabase/migrations/0077_couple_trial_final_charge.sql` in the SQL
editor and confirm:

```sql
select to_regprocedure('public.claim_couple_trial_charges()');
select to_regprocedure('public.mark_couple_trial_charge_failed(uuid)');
```

Authenticated clients must **not** be able to execute either (permission denied).

## 2. Set the Stripe secret on the function

Dashboard → Edge Functions → **charge-trial-balance** → Secrets:

- `STRIPE_SECRET_KEY` — same key the Next app uses (`sk_test_…` / `sk_live_…`)

Platform injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Deploy

From the repo root, name the project (never rely on whatever is currently linked):

```bash
npx supabase functions deploy charge-trial-balance --project-ref <ref> --no-verify-jwt
```

Staging: `qgpadkqpzxzsxtghzumq`. Production: `szqlbsmvsnxzlitjeewc`.

`--no-verify-jwt` is intentional: the function checks
`Authorization: Bearer <service_role>` itself so Dashboard schedules and curl
both work. Do **not** leave it callable without that bearer.

## 4. One-shot invoke (no schedule yet)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/charge-trial-balance" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Expect JSON like
`{ "ok": true, "claimed": N, "attempted": N, "failed_closed": M, "errors": [...] }`.

## 5. Stripe webhook events

The Next app webhook must receive:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Add them in the Stripe Dashboard (or CLI listen) if they are not already
subscribed. Without these, rows stay in `charging` after a successful create.

## 6. Schedule (only after checkpoints pass)

Dashboard → Edge Functions → **charge-trial-balance** → Schedules → add hourly:

```
0 * * * *
```

Do not enable a live schedule until a manual invoke succeeds against a
backdated test row.
