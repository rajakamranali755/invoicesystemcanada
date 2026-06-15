export interface Item {
  id: string;
  serial_number: string;
  name: string;
  description: string | null;
  supplier_company: string;
  price: number;
  gst_percent: number;
  quantity_available: number;
  sold_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
  design_template: string; // 'classic' | 'modern' | 'vibrant'
  terms: string;
  role: "seller" | "purchaser" | "both";
  created_at: string;
  signature_url?: string;
  signature_position?: "left" | "right" | "none";
  website?: string;
  social_links?: string;
}

export interface CompanyService {
  id: string;
  company_id: string;
  category: string;
  description: string;
  price_label: string;
  default_price: number;
  notes: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string | null;
  customer_name: string;
  customer_contact: string;
  customer_address: string;
  customer_email: string;
  customer_tax_number: string;
  notes: string | null;
  invoice_date: string;
  total_quantity: number;
  total_subtotal: number;
  total_gst: number;
  grand_total: number;
  amount_paid: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string | null;
  item_name: string;
  serial_number: string | null;
  quantity: number;
  unit_price: number;
  gst_mode: "percent" | "amount";
  gst_value: number;
  subtotal: number;
  gst_amount: number;
  line_total: number;
  created_at: string;
}

export const COMPANY_NAME = "ABC_CANADA COMPANY";

export function fmtMoney(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}