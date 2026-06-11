
-- Add signature support and enforce unique HST per company
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS signature_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature_position text NOT NULL DEFAULT 'right';

-- Unique HST (only for non-empty values)
CREATE UNIQUE INDEX IF NOT EXISTS companies_tax_number_unique
  ON public.companies (tax_number)
  WHERE tax_number <> '';

-- New invoice number format: YYMM + 3-digit per-month counter (no INV- prefix)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix text := to_char(now(), 'YYMM');
  next_num int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(SUBSTRING(invoice_number FROM 5), '[^0-9]', '', 'g'), '')::int), 0) + 1
    INTO next_num
  FROM public.invoices
  WHERE invoice_number ~ ('^' || prefix || '[0-9]+$');
  RETURN prefix || LPAD(next_num::text, 3, '0');
END;
$$;
