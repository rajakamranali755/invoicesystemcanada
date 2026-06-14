-- Allow deleting a company_service without breaking historical invoices
ALTER TABLE public.invoice_items
  DROP CONSTRAINT IF EXISTS invoice_items_company_service_id_fkey;
ALTER TABLE public.invoice_items
  ADD CONSTRAINT invoice_items_company_service_id_fkey
  FOREIGN KEY (company_service_id) REFERENCES public.company_services(id) ON DELETE SET NULL;

-- Add website + social_links to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_links text NOT NULL DEFAULT '';