ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'both';
ALTER TABLE public.companies ADD CONSTRAINT companies_role_check CHECK (role IN ('seller','purchaser','both'));

-- Mark the three existing seed companies as sellers
UPDATE public.companies SET role = 'seller' WHERE name IN ('MapleBuild Renovations','NorthernIT Solutions','GTA Mobile & Tech');

-- Add three purchaser companies
INSERT INTO public.companies (name, address, phone, email, tax_number, primary_color, accent_color, design_template, role, terms)
VALUES
  ('Skyline Property Group', '88 King St W, Toronto, ON M5X 1A1', '+1 416-555-0142', 'accounts@skylineproperty.ca', 'HST 800111222', '#1e3a8a', '#fbbf24', 'classic', 'purchaser', 'Payment due within 30 days of invoice date.'),
  ('Aurora Retail Holdings', '500 Bay St, Toronto, ON M5G 2K6', '+1 416-555-0188', 'ap@auroraretail.ca', 'HST 800333444', '#0f766e', '#f97316', 'modern', 'purchaser', 'Net 15. Late payments subject to 1.5% monthly interest.'),
  ('Northwind Logistics Inc.', '2200 Yonge St, Toronto, ON M4S 2C6', '+1 416-555-0177', 'billing@northwindlogistics.ca', 'HST 800555666', '#7c2d12', '#facc15', 'vibrant', 'purchaser', 'All disputes must be raised within 7 days of receipt.')
ON CONFLICT DO NOTHING;