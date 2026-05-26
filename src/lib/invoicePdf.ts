import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, COMPANY_NAME, type Invoice, type InvoiceItem } from "@/lib/types";

export function buildInvoicePdf(invoice: Invoice, items: InvoiceItem[]) {
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
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.text(`Total Qty: ${invoice.total_quantity}`, 140, y);
  doc.text(`Subtotal: ${fmtMoney(invoice.total_subtotal)}`, 140, y + 6);
  doc.text(`GST: ${fmtMoney(invoice.total_gst)}`, 140, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: ${fmtMoney(invoice.grand_total)}`, 140, y + 20);
  if (invoice.notes) {
    doc.setFont("helvetica", "normal");
    doc.text(`Notes: ${invoice.notes}`, 14, y + 30);
  }
  return doc;
}

export function openInvoicePdf(invoice: Invoice, items: InvoiceItem[]) {
  const doc = buildInvoicePdf(invoice, items);
  const url = doc.output("bloburl");
  window.open(url, "_blank");
}

export function downloadInvoicePdf(invoice: Invoice, items: InvoiceItem[]) {
  const doc = buildInvoicePdf(invoice, items);
  doc.save(`${invoice.invoice_number}.pdf`);
}