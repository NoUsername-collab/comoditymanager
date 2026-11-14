-- 120 — No invoice has ever been sent to ANAF.
--
-- The e-Factura queue ran against a stand-in that answered "accepted" without
-- sending anything (and, with keys set, failed every time): the real SPV upload
-- was never built. Invoices of properties that chose "Automat, prin e-Factura
-- ANAF" therefore show "ANAF: acceptat" for documents ANAF never received.
--
-- This puts the record straight:
--   * every property is back on sending invoices itself (the option is no
--     longer offered until the upload exists);
--   * every submission job, whatever it said, is marked failed with the reason
--     "anaf.never_sent" and no further attempts, so nothing retries it later;
--   * each invoice that had a status now shows "failed", so the owner can see
--     which invoices still have to be sent to e-Factura by hand.

update public.tenant_fiscal_settings
set provider = 'internal_pdf',
    anaf_enabled = false
where provider = 'anaf' or anaf_enabled;

update public.fiscal_submission_jobs
set status = 'failed',
    last_error = 'anaf.never_sent',
    attempt_count = greatest(attempt_count, max_attempts),
    resolved_at = coalesce(resolved_at, now())
where status <> 'failed' or last_error is distinct from 'anaf.never_sent';

update public.booking_invoices
set fiscal_status = 'failed'
where fiscal_status is not null and fiscal_status <> 'failed';
