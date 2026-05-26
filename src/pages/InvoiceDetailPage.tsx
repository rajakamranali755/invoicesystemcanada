import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Route } from "@/routes/_app.invoices.$id";
import type { Invoice, InvoiceItem } from "@/lib/types";
import { fmtMoney, COMPANY_NAME } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
      return { invoice: inv as Invoice, items: items as InvoiceItem[] };
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;
  const { invoice, items } = data;

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(COMPANY_NAME, 14, 18);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Invoice: ${invoice.invoice_number}`, 14, 28);
    doc.text(`Date: ${invoice.invoice_date}`, 14, 34);
    doc.text(`Customer: ${invoice.customer_name || "—"}`, 14, 40);
    doc.text(`Contact: ${invoice.customer_contact || "—"}`, 14, 46);

    autoTable(doc, {
      startY: 54,
      head: [["Item", "Serial", "Qty", "Unit", "Subtotal", "GST", "Total"]],
      body: items.map((r) => [
        r.item_name, r.serial_number ?? "", r.quantity,
        fmtMoney(r.unit_price), fmtMoney(r.subtotal),
        fmtMoney(r.gst_amount), fmtMoney(r.line_total),
      ]),
    });
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Qty: ${invoice.total_quantity}`, 140, y);
    doc.text(`Subtotal: ${fmtMoney(invoice.total_subtotal)}`, 140, y + 6);
    doc.text(`GST: ${fmtMoney(invoice.total_gst)}`, 140, y + 12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${fmtMoney(invoice.grand_total)}`, 140, y + 20);
    if (invoice.notes) {
      doc.setFont("helvetica", "normal");
      doc.text(`Notes: ${invoice.notes}`, 14, y + 30);
    }
    doc.save(`${invoice.invoice_number}.pdf`);
  };

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

      <Card className="p-10 print:shadow-none print:border-0">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{COMPANY_NAME}</h1>
            <p className="text-sm text-muted-foreground mt-1">Invoice & Inventory Management</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">INVOICE</p>
            <p className="font-mono text-sm mt-1">{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">{invoice.invoice_date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Bill To</p>
            <p className="font-semibold">{invoice.customer_name || "—"}</p>
            <p className="text-sm text-muted-foreground">{invoice.customer_contact}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-2">Item</th>
              <th>Serial</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit</th>
              <th className="text-right">Subtotal</th>
              <th className="text-right">GST</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.item_name}</td>
                <td className="font-mono text-xs">{r.serial_number}</td>
                <td className="text-right">{r.quantity}</td>
                <td className="text-right">{fmtMoney(r.unit_price)}</td>
                <td className="text-right">{fmtMoney(r.subtotal)}</td>
                <td className="text-right">{fmtMoney(r.gst_amount)}</td>
                <td className="text-right font-semibold">{fmtMoney(r.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Quantity</span><span>{invoice.total_quantity}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(invoice.total_subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{fmtMoney(invoice.total_gst)}</span></div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Grand Total</span><span>{fmtMoney(invoice.grand_total)}</span></div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8">
            <p className="text-xs uppercase text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
          <div className="border-t pt-2 text-muted-foreground">Customer Signature</div>
          <div className="border-t pt-2 text-muted-foreground">Authorized Signature</div>
        </div>
      </Card>
    </div>
  );
}