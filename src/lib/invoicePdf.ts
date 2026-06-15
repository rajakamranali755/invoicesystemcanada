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

function readable(r: number, g: number, b: number): [number, number, number] {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.55) return [r, g, b];
  const f = 0.35;
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

function contrastOn(r: number, g: number, b: number): [number, number, number] {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.6 ? [255, 255, 255] : [0, 0, 0];
}

// Distinctive font per template for the company name so they don't look identical.
function nameFont(tpl: string): [string, string] {
  switch (tpl) {
    case "elegant": return ["times", "bolditalic"];
    case "executive": return ["times", "bold"];
    case "monochrome": return ["courier", "bold"];
    case "industrial": return ["courier", "bold"];
    case "minimal": return ["helvetica", "normal"];
    case "geometric": return ["times", "bold"];
    case "corporate": return ["helvetica", "bold"];
    case "gradient": return ["helvetica", "bolditalic"];
    case "bold": return ["helvetica", "bold"];
    case "modern": return ["helvetica", "bold"];
    case "classic": return ["times", "bold"];
    default: return ["helvetica", "bold"];
  }
}

function drawHeader(doc: jsPDF, c: Company, tpl: string) {
  const [pr, pg, pb] = hexToRgb(c.primary_color || "#0f1b3d");
  const [ar, ag, ab] = hexToRgb(c.accent_color || "#c9a84c");
  const W = doc.internal.pageSize.getWidth();
  const [tpR, tpG, tpB] = contrastOn(pr, pg, pb);
  const [nf, ns] = nameFont(tpl);

  if (tpl === "classic") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 32, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 32, W, 2, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(22);
    doc.text(c.name.toUpperCase(), 14, 18);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(c.address.split("\n").join(" · "), 14, 26);
  } else if (tpl === "modern") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 50, doc.internal.pageSize.getHeight(), "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(15);
    doc.text(c.name, 6, 20, { maxWidth: 40 });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(c.address, 6, 40, { maxWidth: 40 });
  } else if (tpl === "elegant") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.5);
    doc.line(14, 14, W - 14, 14); doc.line(14, 40, W - 14, 40);
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(24);
    doc.text(c.name, W / 2, 26, { align: "center" });
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(c.address.split("\n").join(" · "), W / 2, 34, { align: "center" });
  } else if (tpl === "bold") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 44, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 44, W, 6, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(28);
    doc.text(c.name.toUpperCase(), 14, 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join("  ·  "), 14, 36);
  } else if (tpl === "minimal") {
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(14);
    doc.text(c.name.toUpperCase(), 14, 18);
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(" / "), 14, 25);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.2);
    doc.line(14, 32, W - 14, 32);
  } else if (tpl === "corporate") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 22, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 22, W, 14, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name, 14, 14);
    const [taR, taG, taB] = contrastOn(ar, ag, ab);
    doc.setTextColor(taR, taG, taB); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 30);
  } else if (tpl === "monochrome") {
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 40, W, 1.2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont(nf, ns); doc.setFontSize(20);
    doc.text(c.name.toUpperCase(), 14, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join("  ·  "), 14, 30);
  } else if (tpl === "gradient") {
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      const r = Math.round(pr + (ar - pr) * t);
      const g = Math.round(pg + (ag - pg) * t);
      const b = Math.round(pb + (ab - pb) * t);
      doc.setFillColor(r, g, b); doc.rect(0, i, W, 1.05, "F");
    }
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(26);
    doc.text(c.name, 14, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 32);
  } else if (tpl === "geometric") {
    doc.setFillColor(pr, pg, pb); doc.circle(20, 22, 14, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(W - 60, 8, 46, 28, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("INV", 13, 25);
    doc.setTextColor(0, 0, 0); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name.toUpperCase(), 40, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(" · "), 40, 27);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.4); doc.line(0, 40, W, 40);
  } else if (tpl === "executive") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(1.2); doc.line(14, 12, W - 14, 12);
    doc.setLineWidth(0.3); doc.line(14, 14.5, W - 14, 14.5);
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(22);
    doc.text(c.name, 14, 26);
    doc.setFont("times", "italic"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text(c.address.split("\n").join(" · "), 14, 33);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.6); doc.line(14, 41, W - 14, 41);
  } else if (tpl === "industrial") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 36, "F");
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5); doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(4, 4, W - 8, 28); doc.setLineDashPattern([], 0);
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name.toUpperCase(), 10, 18);
    doc.setFont("courier", "normal"); doc.setFontSize(8);
    doc.text(`// ${c.address.split("\n").join(" / ")}`, 10, 26);
  } else {
    // vibrant
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.triangle(W - 80, 0, W, 0, W, 40, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(24);
    doc.text(c.name, 14, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(" · "), 14, 30);
  }
  doc.setTextColor(0, 0, 0);
}

// Render terms paragraphs with justified text + hanging indent for numbered/bulleted lines.
function drawJustifiedTerms(doc: jsPDF, terms: string, x: number, startY: number, maxW: number): number {
  let y = startY;
  const paragraphs = terms.split(/\n/);
  for (const p of paragraphs) {
    if (!p.trim()) { y += 4; continue; }
    const m = p.match(/^(\s*)((?:\d+[.)]|[-*•·])\s+)(.*)$/);
    if (m) {
      const marker = m[2];
      const body = m[3];
      const markerW = doc.getTextWidth(marker);
      const lines = doc.splitTextToSize(body, maxW - markerW);
      doc.text(marker, x, y);
      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], x + markerW, y);
        y += 4.2;
      }
    } else {
      const lines = doc.splitTextToSize(p, maxW);
      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], x, y);
        y += 4.2;
      }
    }
  }
  return y;
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
  const rightEnd = doc.internal.pageSize.getWidth() - 14;
  const startY = tpl === "modern" ? 50 : 48;
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [ar, ag, ab] = hexToRgb(c.accent_color);
  const [tpR, tpG, tpB] = contrastOn(pr, pg, pb);
  const [lr, lg, lb] = readable(pr, pg, pb);

  // Seller contact details — right-aligned, parallel to seller name in header
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
  let sellerRY = startY;
  if (c.phone) { doc.text(c.phone, rightEnd, sellerRY, { align: "right" }); sellerRY += 4; }
  if (c.email) { doc.text(c.email, rightEnd, sellerRY, { align: "right" }); sellerRY += 4; }
  if (c.tax_number) { doc.text(`HST: ${c.tax_number}`, rightEnd, sellerRY, { align: "right" }); sellerRY += 4; }
  if (c.website) { doc.text(c.website, rightEnd, sellerRY, { align: "right" }); sellerRY += 4; }
  if (c.social_links) {
    const sLines = doc.splitTextToSize(c.social_links, 80);
    doc.text(sLines, rightEnd, sellerRY, { align: "right" }); sellerRY += sLines.length * 4;
  }
  doc.setTextColor(0, 0, 0);

  // Invoice # (left) — single line
  const metaY = Math.max(startY, sellerRY) + 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(lr, lg, lb);
  const invHashLabel = "INVOICE #  ";
  doc.text(invHashLabel, leftStart, metaY);
  const labelW = doc.getTextWidth(invHashLabel);
  doc.setTextColor(0, 0, 0); doc.setFontSize(12);
  doc.text(invoice.invoice_number, leftStart + labelW, metaY);
  // Invoice date (right)
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
  const dateW = doc.getTextWidth(invoice.invoice_date);
  doc.text(invoice.invoice_date, rightEnd, metaY, { align: "right" });
  doc.setFontSize(9); doc.setTextColor(lr, lg, lb);
  doc.text("INVOICE DATE", rightEnd - dateW - 3, metaY, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // BILL TO — label · blank line · name · address (tight) · HST
  const toY = metaY + 10;
  doc.setFont("helvetica", "bold"); doc.setTextColor(lr, lg, lb); doc.setFontSize(10);
  doc.text("BILL TO", leftStart, toY);

  // Blank line, then name
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  let nameY = toY + 7;
  doc.text(invoice.customer_name || "—", leftStart, nameY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  let yCursor = nameY + 4;
  if (invoice.customer_address) {
    const lines = doc.splitTextToSize(invoice.customer_address, 100);
    doc.text(lines, leftStart, yCursor); yCursor += lines.length * 4;
  }
  if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, leftStart, yCursor); yCursor += 4; }
  // Right column (parallel) — contact & email
  let rCursor = nameY;
  if (invoice.customer_contact) { doc.text(invoice.customer_contact, rightEnd, rCursor, { align: "right" }); rCursor += 4; }
  if (invoice.customer_email) { doc.text(invoice.customer_email, rightEnd, rCursor, { align: "right" }); rCursor += 4; }
  yCursor = Math.max(yCursor, rCursor);

  autoTable(doc, {
    startY: yCursor + 6,
    margin: { left: leftStart, right: 14 },
    head: [["Description", "Qty", "Rate", "Total"]],
    body: items.map((r) => [
      r.item_name, r.quantity,
      fmtMoney(r.unit_price), fmtMoney(r.subtotal),
    ]),
    headStyles: { fillColor: [pr, pg, pb], textColor: [tpR, tpG, tpB], fontStyle: "bold" },
    alternateRowStyles: tpl === "vibrant" ? { fillColor: [255, 245, 240] } : tpl === "modern" ? { fillColor: [240, 248, 245] } : { fillColor: [245, 243, 238] },
    styles: { font: "helvetica", fontSize: 9 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 36 },
    },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  // Totals — right-aligned at the right table edge
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text(`Subtotal:  ${fmtMoney(invoice.total_subtotal)}`, rightEnd, y, { align: "right" }); y += 6;
  doc.text(`HST (13%):  ${fmtMoney(invoice.total_gst)}`, rightEnd, y, { align: "right" }); y += 8;

  // Total Due bar — width sized to its text, right-edge aligned to rightEnd
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  const totalDueStr = `Total Due:  ${fmtMoney(invoice.grand_total)}`;
  const tdW = doc.getTextWidth(totalDueStr) + 8;
  doc.setFillColor(pr, pg, pb);
  doc.rect(rightEnd - tdW, y - 5, tdW, 9, "F");
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(totalDueStr, rightEnd - 4, y + 1, { align: "right" });
  doc.setTextColor(0, 0, 0); y += 10;

  if (invoice.amount_paid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Paid:  ${fmtMoney(invoice.amount_paid)}`, rightEnd, y, { align: "right" }); y += 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(ar, ag, ab);
    doc.text(`Balance:  ${fmtMoney(invoice.grand_total - invoice.amount_paid)}`, rightEnd, y, { align: "right" });
    doc.setTextColor(0, 0, 0); y += 8;
  }

  y = Math.max(y, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30);
  if (c.terms) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...readable(pr, pg, pb));
    doc.text("Terms & Conditions", leftStart, y); y += 6;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    y = drawJustifiedTerms(doc, c.terms, leftStart, y, doc.internal.pageSize.getWidth() - leftStart - 20);
    y += 4;
  }

  if (invoice.notes) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...readable(pr, pg, pb));
    doc.text("Notes", leftStart, y); y += 5;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(invoice.notes, leftStart, y, { maxWidth: doc.internal.pageSize.getWidth() - leftStart - 20 });
  }

  // Signature — skip if position is "none"
  const pos = c.signature_position || "right";
  if (pos !== "none") {
    const pageH = doc.internal.pageSize.getHeight();
    const sigBlockW = 70;
    const sigX = pos === "left" ? leftStart : doc.internal.pageSize.getWidth() - 14 - sigBlockW;
    const sigBaseY = pageH - 30;
    if (c.signature_url) {
      try {
        const fmt = c.signature_url.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(c.signature_url, fmt, sigX, sigBaseY - 18, 50, 16);
      } catch (e) { console.warn("signature image failed", e); }
    }
    doc.setDrawColor(pr, pg, pb); doc.line(sigX, sigBaseY, sigX + sigBlockW, sigBaseY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("Authorized Signature", sigX, sigBaseY + 5);
    doc.text(c.name, sigX, sigBaseY + 10);
  }

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
