-- 093: Per-tenant email delivery policy (platform Resend, BYOK, disabled)
-- Future-proof: BYOK keys live in env/vault (not raw secrets in DB).

CREATE TABLE IF NOT EXISTS public.tenant_email_delivery (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  delivery_mode text NOT NULL DEFAULT 'platform'
    CHECK (delivery_mode IN ('platform', 'tenant_resend', 'disabled')),
  mail_domain_override text DEFAULT NULL,
  monthly_send_cap integer DEFAULT NULL,
  byok_configured boolean NOT NULL DEFAULT false,
  operator_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_email_delivery IS
  'Platform-operator email delivery policy per tenant. API keys for tenant_resend are env/vault-backed.';
COMMENT ON COLUMN public.tenant_email_delivery.delivery_mode IS
  'platform = shared RESEND_API_KEY; tenant_resend = BYOK; disabled = noop for tenant';
COMMENT ON COLUMN public.tenant_email_delivery.byok_configured IS
  'True when operator confirmed BYOK setup (key in RESEND_API_KEY_TENANT__<SLUG> or vault)';

ALTER TABLE public.tenant_email_delivery ENABLE ROW LEVEL SECURITY;

-- No tenant-facing policies — service role / platform admin only.
