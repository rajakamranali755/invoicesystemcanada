CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  tax_number text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#0f1b3d',
  accent_color text NOT NULL DEFAULT '#c9a84c',
  font_family text NOT NULL DEFAULT 'helvetica',
  design_template text NOT NULL DEFAULT 'classic',
  terms text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all companies" ON public.companies;
CREATE POLICY "Public all companies" ON public.companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.company_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  description text NOT NULL,
  price_label text NOT NULL DEFAULT '',
  default_price numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_services TO anon, authenticated;
GRANT ALL ON public.company_services TO service_role;
ALTER TABLE public.company_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all company_services" ON public.company_services;
CREATE POLICY "Public all company_services" ON public.company_services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_address text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_tax_number text NOT NULL DEFAULT '';
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS company_service_id uuid REFERENCES public.company_services(id);