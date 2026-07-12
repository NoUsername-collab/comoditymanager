-- 095: Monthly transactional email usage + atomic cap enforcement

CREATE TABLE IF NOT EXISTS public.tenant_email_usage (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period_month)
);

COMMENT ON TABLE public.tenant_email_usage IS
  'Monthly outbound email counter per tenant (UTC month). Enforced by acquire/release RPCs.';
COMMENT ON COLUMN public.tenant_email_usage.period_month IS
  'First calendar day of UTC month, e.g. 2026-07-01.';

ALTER TABLE public.tenant_email_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_utc_month_period()
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('month', (now() AT TIME ZONE 'utc'))::date);
$$;

CREATE OR REPLACE FUNCTION public.acquire_tenant_email_send_slot(
  p_tenant_id uuid,
  p_cap integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period date := public.current_utc_month_period();
  v_count integer;
BEGIN
  INSERT INTO public.tenant_email_usage (tenant_id, period_month, sent_count)
  VALUES (p_tenant_id, v_period, 0)
  ON CONFLICT (tenant_id, period_month) DO NOTHING;

  SELECT sent_count
  INTO v_count
  FROM public.tenant_email_usage
  WHERE tenant_id = p_tenant_id
    AND period_month = v_period
  FOR UPDATE;

  IF p_cap IS NOT NULL AND v_count >= p_cap THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'sent_count', v_count,
      'cap', p_cap,
      'period_month', v_period
    );
  END IF;

  UPDATE public.tenant_email_usage
  SET sent_count = sent_count + 1,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND period_month = v_period;

  RETURN jsonb_build_object(
    'allowed', true,
    'sent_count', v_count + 1,
    'cap', p_cap,
    'period_month', v_period
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_tenant_email_send_slot(
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period date := public.current_utc_month_period();
BEGIN
  UPDATE public.tenant_email_usage
  SET sent_count = GREATEST(sent_count - 1, 0),
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND period_month = v_period
    AND sent_count > 0;
END;
$$;
