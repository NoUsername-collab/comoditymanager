-- 069: Email notification settings per tenant
-- Adds toggles and customization fields for Resend-powered email notifications.

ALTER TABLE pension_settings
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notify_new_request boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notify_confirmation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notify_cancellation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_notify_daily_summary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_reply_to text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_custom_footer text DEFAULT NULL;
