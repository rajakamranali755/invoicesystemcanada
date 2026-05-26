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

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_contact: string;
  notes: string | null;
  invoice_date: string;
  total_quantity: number;
  total_subtotal: number;
  total_gst: number;
  grand_total: number;
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
  return `$${(v || 0).toFixed(2)}`;
}