
-- Fix function search_path warning
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
SET search_path = public
AS $$
  SELECT 'INV-' || LPAD(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

-- Replace permissive RLS policies on items
DROP POLICY IF EXISTS "Public access items" ON public.items;
CREATE POLICY "Authenticated read items" ON public.items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert items" ON public.items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update items" ON public.items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete items" ON public.items
  FOR DELETE TO authenticated USING (true);

-- Replace permissive RLS policies on invoices
DROP POLICY IF EXISTS "Public access invoices" ON public.invoices;
CREATE POLICY "Authenticated read invoices" ON public.invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete invoices" ON public.invoices
  FOR DELETE TO authenticated USING (true);

-- Replace permissive RLS policies on invoice_items
DROP POLICY IF EXISTS "Public access invoice_items" ON public.invoice_items;
CREATE POLICY "Authenticated read invoice_items" ON public.invoice_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert invoice_items" ON public.invoice_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update invoice_items" ON public.invoice_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete invoice_items" ON public.invoice_items
  FOR DELETE TO authenticated USING (true);
