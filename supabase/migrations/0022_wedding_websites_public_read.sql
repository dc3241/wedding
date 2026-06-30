-- ============================================================
-- 0022_wedding_websites_public_read.sql
-- Anonymous read of published wedding websites only (3.6b).
-- Apply AFTER 0021.
-- ============================================================

create policy "Public read of published wedding websites"
  on wedding_websites for select
  to anon, authenticated
  using (published = true);
