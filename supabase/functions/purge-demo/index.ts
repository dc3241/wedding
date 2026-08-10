// supabase/functions/purge-demo/index.ts
// DEMO-04 — scheduled cleanup for ephemeral demos.
// Dom deploys + schedules this manually (pg_cron is not enabled).
//
// Deploy:
//   supabase functions deploy purge-demo --no-verify-jwt
//
// Schedule (Dashboard → Edge Functions → purge-demo → Schedules), hourly:
//   cron: 0 * * * *
//
// Or invoke once (service role JWT as Bearer):
//   curl -X POST "$SUPABASE_URL/functions/v1/purge-demo" \
//     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//     -H "Content-Type: application/json"
//
// Manual SQL checkpoints (run in SQL editor, not on a live schedule yet):
//   select purge_demo_accounts();
//   select purge_demo_auth_users();

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing_supabase_env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Require service-role bearer so the function is not a public wipe endpoint.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token !== serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const accounts = await supabase.rpc("purge_demo_accounts");
  const authUsers = await supabase.rpc("purge_demo_auth_users");

  const ok = !accounts.error && !authUsers.error;

  return new Response(
    JSON.stringify({
      ok,
      accounts_deleted: accounts.data ?? null,
      accounts_error: accounts.error?.message ?? null,
      auth_users_deleted: authUsers.data ?? null,
      auth_users_error: authUsers.error?.message ?? null,
    }),
    {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    },
  );
});
