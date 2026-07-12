-- 094: Encrypted tenant Resend API keys (BYOK vault)
-- Ciphertext only; decryption uses TENANT_SECRETS_ENCRYPTION_KEY on the server.

CREATE TABLE IF NOT EXISTS public.tenant_email_secrets (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  resend_api_key_ciphertext text,
  resend_key_hint text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_email_secrets IS
  'Platform-operator secrets per tenant. Resend BYOK keys stored AES-256-GCM encrypted.';
COMMENT ON COLUMN public.tenant_email_secrets.resend_key_hint IS
  'Masked hint for UI only, e.g. re_...x7Kp — never the full key.';

ALTER TABLE public.tenant_email_secrets ENABLE ROW LEVEL SECURITY;
