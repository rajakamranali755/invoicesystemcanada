import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Route } from "@/routes/_app.invoices.$id";
import type { Invoice, InvoiceItem, Company } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { downloadInvoicePdf } from "@/lib/invoicePdf";

export function InvoiceDetailPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [{ data: inv, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", id).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", id),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      const invoice = inv as Invoice;
      let company: Company | null = null;
      if (invoice.company_id) {
        const { data: c } = await supabase.from("companies").select("*").eq("id", invoice.company_id).single();
        company = (c as Company) ?? null;
      }
      return { invoice, items: items as InvoiceItem[], company };
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;
  const { invoice, items, company } = data;

  const downloadPdf = () => downloadInvoicePdf(invoice, items, company);
  const primary = company?.primary_color || "#0f1b3d";
  const accent = company?.accent_color || "#c9a84c";
  // Darken light/pastel brand colors so labels stay legible on white backgrounds.
  const readableHex = (hex: string) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum < 0.55) return hex;
    const f = 0.35;
    const to = (n: number) => Math.round(n * f).toString(16).padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`;
  };
  const label = readableHex(primary);
  // Contrast text color (black/white) for solid primary backgrounds
  const contrastOnHex = (hex: string) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.6 ? "#ffffff" : "#000000";
  };
  const onPrimary = contrastOnHex(primary);
  const balance = (invoice.grand_total || 0) - (invoice.amount_paid || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/invoices"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button onClick={downloadPdf}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      <Card className="p-10 print:shadow-none print:border-0 overflow-hidden">
        <div className="flex justify-between items-start border-b pb-6 mb-6 gap-6" style={{ borderColor: accent }}>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight italic" style={{ color: label, fontFamily: "Georgia, 'Times New Roman', serif" }}>{company?.name || "Company"}</h1>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{company?.address}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground min-w-0 whitespace-pre-line">
            {company?.phone && <p>{company.phone}</p>}
            {company?.email && <p>{company.email}</p>}
            {company?.tax_number && <p>HST: {company.tax_number}</p>}
            {company?.website && <p>{company.website}</p>}
            {company?.social_links && <p>{company.social_links}</p>}
          </div>
        </div>

        {/* Invoice # / Date — single-line each */}
        <div className="flex justify-between items-start mb-6">
          <p className="font-mono text-lg font-semibold">
            <span className="text-xs uppercase mr-2" style={{ color: label }}>Invoice #</span>
            {invoice.invoice_number}
          </p>
          <div className="text-right">
            <p className="font-mono text-lg font-semibold">
              <span className="text-xs uppercase mr-2" style={{ color: label }}>Invoice Date</span>
              {invoice.invoice_date}
            </p>
            <p className="text-[10px] text-muted-foreground">YYYY-MM-DD</p>
          </div>
        </div>

        {/* Bill To — left: name/address/HST · right: contact/email/website/social */}
        <div className="mb-6">
          <p className="text-xs uppercase mb-1" style={{ color: label }}>Bill To</p>
          <div className="flex justify-between items-start gap-6">
            <div className="min-w-0">
              <p className="font-semibold">{invoice.customer_name || "—"}</p>
              {invoice.customer_address && <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.customer_address}</p>}
              {invoice.customer_tax_number && <p className="text-xs text-muted-foreground">HST: {invoice.customer_tax_number}</p>}
            </div>
            <div className="text-right text-sm text-muted-foreground min-w-0">
              {invoice.customer_contact && <p>{invoice.customer_contact}</p>}
              {invoice.customer_email && <p>{invoice.customer_email}</p>}
            </div>
          </div>
        </div>

        {/* Issuer contact details — parallel to company name block (right side under header is already shown above) */}
        {(company?.website || company?.social_links) && (
          <div className="mb-6 text-right text-xs text-muted-foreground whitespace-pre-line">
            {company?.website && <p>{company.website}</p>}
            {company?.social_links && <p>{company.social_links}</p>}
          </div>
        )}

        <table className="w-full text-sm">
          <thead style={{ background: primary, color: onPrimary }}>
            <tr className="text-left">
              <th className="py-2 px-2">Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right px-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 px-2">{r.item_name}</td>
                <td className="text-right">{r.quantity}</td>
                <td className="text-right">{fmtMoney(r.unit_price)}</td>
                <td className="text-right font-semibold px-2">{fmtMoney(r.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(invoice.total_subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">HST (13%)</span><span>{fmtMoney(invoice.total_gst)}</span></div>
            <div className="flex justify-between pt-2 text-lg font-bold px-2 rounded" style={{ background: primary, color: onPrimary }}><span>Total Due</span><span>{fmtMoney(invoice.grand_total)}</span></div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between pt-1"><span className="text-muted-foreground">Paid</span><span>{fmtMoney(invoice.amount_paid)}</span></div>
                <div className="flex justify-between font-semibold" style={{ color: accent }}><span>Balance</span><span>{fmtMoney(balance)}</span></div>
              </>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8">
            <p className="text-xs uppercase mb-1" style={{ color: label }}>Notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}

        {company?.terms && (
          <div className="mt-8">
            <p className="text-xs uppercase mb-1" style={{ color: label }}>Terms & Conditions</p>
            <p className="text-xs whitespace-pre-line text-muted-foreground">{company.terms}</p>
          </div>
        )}

        <div className={"mt-16 flex " + (company?.signature_position === "left" ? "justify-start" : "justify-end")}>
          <div className="w-64 text-sm">
            {company?.signature_url && (
              <img src={company.signature_url} alt="Signature" className="h-16 object-contain mb-1" />
            )}
            <div className="border-t pt-2 text-muted-foreground" style={{ borderColor: accent }}>
              Authorized Signature — {company?.name}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}