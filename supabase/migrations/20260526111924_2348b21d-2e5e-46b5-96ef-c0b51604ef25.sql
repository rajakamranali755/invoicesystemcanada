
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS supplier_company text NOT NULL DEFAULT '';

-- Drop authenticated policies and recreate as public
DROP POLICY IF EXISTS "Authenticated delete items" ON public.items;
DROP POLICY IF EXISTS "Authenticated insert items" ON public.items;
DROP POLICY IF EXISTS "Authenticated read items" ON public.items;
DROP POLICY IF EXISTS "Authenticated update items" ON public.items;

DROP POLICY IF EXISTS "Authenticated delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated update invoices" ON public.invoices;

DROP POLICY IF EXISTS "Authenticated delete invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated update invoice_items" ON public.invoice_items;

CREATE POLICY "Public all items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public all invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public all invoice_items" ON public.invoice_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
