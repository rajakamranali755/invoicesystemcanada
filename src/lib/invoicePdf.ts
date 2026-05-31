import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, type Invoice, type InvoiceItem, type Company } from "@/lib/types";

export interface PdfCustomer {
  name: string;
  address?: string;
  contact?: string;
  email?: string;
  tax_number?: string;
  phone?: string;
}

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
  } else if (tpl === "elegant") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.5);
    doc.line(14, 14, W - 14, 14); doc.line(14, 36, W - 14, 36);
    doc.setTextColor(pr, pg, pb); doc.setFont("times", "bold"); doc.setFontSize(22);
    doc.text(c.name, W / 2, 24, { align: "center" });
    doc.setFont("times", "italic"); doc.setFontSize(10);
    doc.text(c.address.split("\n").join(" · "), W / 2, 31, { align: "center" });
    doc.setFont("times", "normal"); doc.setFontSize(9);
    doc.text(`${c.phone}  ·  ${c.email}  ·  HST ${c.tax_number}`, W / 2, 42, { align: "center" });
    doc.setTextColor(ar, ag, ab); doc.setFont("times", "bold"); doc.setFontSize(14);
    doc.text("- INVOICE -", W / 2, 50, { align: "center" });
  } else if (tpl === "bold") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 50, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 50, W, 6, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(26);
    doc.text(c.name.toUpperCase(), 14, 24);
    doc.setFontSize(34); doc.text("INVOICE", W - 14, 24, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join("  ·  "), 14, 34);
    doc.text(`${c.phone}  ·  ${c.email}  ·  HST ${c.tax_number}`, 14, 42);
  } else if (tpl === "minimal") {
    doc.setTextColor(pr, pg, pb); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(c.name.toUpperCase(), 14, 18);
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(" / "), 14, 24);
    doc.text(`${c.phone}  /  ${c.email}  /  HST ${c.tax_number}`, 14, 29);
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(22);
    doc.text("Invoice", W - 14, 22, { align: "right" });
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.2);
    doc.line(14, 34, W - 14, 34);
  } else if (tpl === "corporate") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 22, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 22, W, 14, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(c.name, 14, 14);
    doc.setFontSize(22); doc.text("INVOICE", W - 14, 14, { align: "right" });
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 30);
    doc.text(`${c.phone}  ·  ${c.email}  ·  HST ${c.tax_number}`, W - 14, 30, { align: "right" });
  } else if (tpl === "monochrome") {
    // Stark black/white with thick rule and oversized numeral mark
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 40, W, 1.2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("courier", "bold"); doc.setFontSize(28);
    doc.text("№", 14, 26);
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(c.name.toUpperCase(), 32, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join("  ·  "), 32, 27);
    doc.text(`${c.phone}  ·  ${c.email}  ·  HST ${c.tax_number}`, 32, 33);
    doc.setFont("courier", "normal"); doc.setFontSize(10);
    doc.text("INVOICE", W - 14, 26, { align: "right" });
  } else if (tpl === "gradient") {
    // Faux gradient via stacked bands (primary -> accent)
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      const r = Math.round(pr + (ar - pr) * t);
      const g = Math.round(pg + (ag - pg) * t);
      const b = Math.round(pb + (ab - pb) * t);
      doc.setFillColor(r, g, b); doc.rect(0, i, W, 1.05, "F");
    }
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.text(c.name, 14, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 30);
    doc.text(`${c.phone} · ${c.email} · HST ${c.tax_number}`, 14, 36);
    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("INVOICE", W - 14, 24, { align: "right" });
  } else if (tpl === "geometric") {
    // Decorative circles and squares around the name
    doc.setFillColor(pr, pg, pb); doc.circle(20, 22, 14, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(W - 60, 8, 46, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("INV", 13, 25);
    doc.setTextColor(0, 0, 0); doc.setFontSize(15);
    doc.text(c.name.toUpperCase(), 40, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(" · "), 40, 25);
    doc.text(`${c.phone}  ·  ${c.email}`, 40, 30);
    doc.text(`HST ${c.tax_number}`, 40, 35);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("INVOICE", W - 16, 26, { align: "right" });
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.4); doc.line(0, 40, W, 40);
  } else if (tpl === "executive") {
    // Serif executive: double rule with right-aligned brand
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(1.2); doc.line(14, 12, W - 14, 12);
    doc.setLineWidth(0.3); doc.line(14, 14.5, W - 14, 14.5);
    doc.setTextColor(pr, pg, pb); doc.setFont("times", "bold"); doc.setFontSize(22);
    doc.text(c.name, W - 14, 26, { align: "right" });
    doc.setFont("times", "italic"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text(c.address.split("\n").join(" · "), W - 14, 32, { align: "right" });
    doc.text(`${c.phone}  ·  ${c.email}  ·  HST ${c.tax_number}`, W - 14, 37, { align: "right" });
    doc.setTextColor(ar, ag, ab); doc.setFont("times", "bold"); doc.setFontSize(11);
    doc.text("STATEMENT OF ACCOUNT", 14, 26);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.6); doc.line(14, 41, W - 14, 41);
  } else if (tpl === "industrial") {
    // Stencil / blueprint vibe with dashed border and monospaced labels
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 36, "F");
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5); doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(4, 4, W - 8, 28); doc.setLineDashPattern([], 0);
    doc.setTextColor(255, 255, 255); doc.setFont("courier", "bold"); doc.setFontSize(16);
    doc.text(c.name.toUpperCase(), 10, 16);
    doc.setFont("courier", "normal"); doc.setFontSize(8);
    doc.text(`// ${c.address.split("\n").join(" / ")}`, 10, 23);
    doc.text(`// ${c.phone}  ${c.email}  HST:${c.tax_number}`, 10, 29);
    doc.setFont("courier", "bold"); doc.setFontSize(14);
    doc.text("[ INVOICE ]", W - 10, 22, { align: "right" });
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
    design_template: "classic", terms: "", created_at: "", role: "both",
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

  // FROM (seller) / TO (purchaser) blocks
  const fromY = startY + 22;
  doc.setFont("helvetica", "bold"); doc.setTextColor(pr, pg, pb); doc.setFontSize(10);
  doc.text("FROM", leftStart, fromY);
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(c.name, leftStart, fromY + 6);
  if (c.address) doc.text(doc.splitTextToSize(c.address, 80), leftStart, fromY + 12);
  if (c.phone) doc.text(c.phone, leftStart, fromY + 28);
  if (c.email) doc.text(c.email, leftStart, fromY + 34);
  if (c.tax_number) doc.text(`HST: ${c.tax_number}`, leftStart, fromY + 40);

  const colTo = tpl === "modern" ? 130 : 120;
  doc.setFont("helvetica", "bold"); doc.setTextColor(pr, pg, pb); doc.setFontSize(10);
  doc.text("TO (BILL TO)", colTo, fromY);
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(invoice.customer_name || "—", colTo, fromY + 6);
  if (invoice.customer_address) doc.text(doc.splitTextToSize(invoice.customer_address, 70), colTo, fromY + 12);
  if (invoice.customer_contact) doc.text(`Contact: ${invoice.customer_contact}`, colTo, fromY + 28);
  if (invoice.customer_email) doc.text(invoice.customer_email, colTo, fromY + 34);
  if (invoice.customer_tax_number) doc.text(`HST: ${invoice.customer_tax_number}`, colTo, fromY + 40);

  autoTable(doc, {
    startY: fromY + 50,
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