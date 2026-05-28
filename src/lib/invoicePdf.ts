import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, type Invoice, type InvoiceItem, type Company } from "@/lib/types";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function drawHeader(doc: jsPDF, c: Company, tpl: string) {
  const [pr, pg, pb] = hexToRgb(c.primary_color || "#0f1b3d");
  const [ar, ag, ab] = hexToRgb(c.accent_color || "#c9a84c");
  const W = doc.internal.pageSize.getWidth();

  if (tpl === "classic") {
    // Navy bar + gold underline
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 32, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 32, W, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(c.name.toUpperCase(), 14, 16);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(c.address.split("\n").join(" · "), 14, 24);
    doc.text(`${c.phone}  |  ${c.email}  |  HST: ${c.tax_number}`, 14, 30);
  } else if (tpl === "modern") {
    // Left teal sidebar
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 50, doc.internal.pageSize.getHeight(), "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(c.name, 6, 20, { maxWidth: 40 });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(c.address, 6, 40, { maxWidth: 40 });
    doc.text(c.phone, 6, 64); doc.text(c.email, 6, 70, { maxWidth: 40 });
    doc.text(`HST: ${c.tax_number}`, 6, 80, { maxWidth: 40 });
    doc.setTextColor(ar, ag, ab); doc.setFontSize(24); doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 60, 25);
  } else {
    // Vibrant: diagonal accent block
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.triangle(W - 80, 0, W, 0, W, 40, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text(c.name, 14, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 26);
    doc.text(`${c.phone} · ${c.email} · HST: ${c.tax_number}`, 14, 32);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("INVOICE", W - 14, 24, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
}

export function buildInvoicePdf(invoice: Invoice, items: InvoiceItem[], company: Company | null) {
  const tpl = company?.design_template || "classic";
  const c: Company = company || {
    id: "", name: "Company", address: "", phone: "", email: "", tax_number: "", logo_url: "",
    primary_color: "#0f1b3d", accent_color: "#c9a84c", font_family: "helvetica",
    design_template: "classic", terms: "", created_at: "",
  };
  const doc = new jsPDF();
  drawHeader(doc, c, tpl);

  const leftStart = tpl === "modern" ? 56 : 14;
  const startY = tpl === "modern" ? 50 : 44;
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [ar, ag, ab] = hexToRgb(c.accent_color);

  // Invoice meta
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  if (tpl !== "modern") doc.text("INVOICE", leftStart, startY);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${invoice.invoice_number}`, leftStart, startY + 6);
  doc.text(`Date: ${invoice.invoice_date}`, leftStart, startY + 12);

  // From / To
  const colTo = tpl === "modern" ? 130 : 120;
  doc.setFont("helvetica", "bold"); doc.setTextColor(pr, pg, pb);
  doc.text("BILL TO", colTo, startY);
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(invoice.customer_name || "—", colTo, startY + 6);
  if (invoice.customer_address) doc.text(invoice.customer_address.split("\n"), colTo, startY + 12);
  if (invoice.customer_contact) doc.text(`Contact: ${invoice.customer_contact}`, colTo, startY + 28);
  if (invoice.customer_email) doc.text(invoice.customer_email, colTo, startY + 34);
  if (invoice.customer_tax_number) doc.text(`HST: ${invoice.customer_tax_number}`, colTo, startY + 40);

  autoTable(doc, {
    startY: startY + 50,
    margin: { left: leftStart, right: 14 },
    head: [["Description", "Qty", "Rate", "Subtotal", "GST", "Total"]],
    body: items.map((r) => [
      r.item_name, r.quantity,
      fmtMoney(r.unit_price), fmtMoney(r.subtotal), fmtMoney(r.gst_amount), fmtMoney(r.line_total),
    ]),
    headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: tpl === "vibrant" ? { fillColor: [255, 245, 240] } : tpl === "modern" ? { fillColor: [240, 248, 245] } : { fillColor: [245, 243, 238] },
    styles: { font: "helvetica", fontSize: 9 },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const totalsX = doc.internal.pageSize.getWidth() - 80;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Subtotal: ${fmtMoney(invoice.total_subtotal)}`, totalsX, y); y += 6;
  doc.text(`GST / HST: ${fmtMoney(invoice.total_gst)}`, totalsX, y); y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.setFillColor(pr, pg, pb); doc.setTextColor(255, 255, 255);
  doc.rect(totalsX - 4, y - 5, 75, 9, "F");
  doc.text(`Total Due: ${fmtMoney(invoice.grand_total)}`, totalsX, y + 1);
  doc.setTextColor(0, 0, 0);
  y += 12;
  if (invoice.amount_paid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Paid: ${fmtMoney(invoice.amount_paid)}`, totalsX, y); y += 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(ar, ag, ab);
    doc.text(`Balance: ${fmtMoney(invoice.grand_total - invoice.amount_paid)}`, totalsX, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Terms
  y = Math.max(y, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30);
  if (c.terms) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(pr, pg, pb);
    doc.text("Terms & Conditions", leftStart, y); y += 5;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const lines = doc.splitTextToSize(c.terms, doc.internal.pageSize.getWidth() - leftStart - 20);
    doc.text(lines, leftStart, y);
    y += lines.length * 4 + 4;
  }

  if (invoice.notes) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(pr, pg, pb);
    doc.text("Notes", leftStart, y); y += 5;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(invoice.notes, leftStart, y, { maxWidth: doc.internal.pageSize.getWidth() - leftStart - 20 });
  }

  // Signature
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(pr, pg, pb); doc.line(leftStart, pageH - 30, leftStart + 60, pageH - 30);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("Authorized Signature", leftStart, pageH - 25);
  doc.text(c.name, leftStart, pageH - 20);

  return doc;
}

export function openInvoicePdf(invoice: Invoice, items: InvoiceItem[], company: Company | null) {
  const doc = buildInvoicePdf(invoice, items, company);
  const url = doc.output("bloburl");
  window.open(url, "_blank");
}

export function downloadInvoicePdf(invoice: Invoice, items: InvoiceItem[], company: Company | null) {
  const doc = buildInvoicePdf(invoice, items, company);
  doc.save(`${invoice.invoice_number}.pdf`);
}