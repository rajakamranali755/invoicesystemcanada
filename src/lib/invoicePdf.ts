import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, type Invoice, type InvoiceItem, type Company } from "@/lib/types";
import { buildCustomInvoicePdf } from "@/lib/customInvoicePdf";

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
function lighten(r: number, g: number, b: number, amt: number): [number, number, number] {
  return [
    Math.round(r + (255 - r) * amt),
    Math.round(g + (255 - g) * amt),
    Math.round(b + (255 - b) * amt),
  ];
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
    case "ribbon": return ["helvetica", "bold"];
    case "ledger": return ["courier", "bold"];
    case "boxed": return ["times", "bold"];
    case "diagonal": return ["helvetica", "bold"];
    case "stacked": return ["times", "bolditalic"];
    case "summary-strip": return ["helvetica", "bold"];
    case "corporate-blue": return ["helvetica", "bold"];
    case "banner-green": return ["helvetica", "bolditalic"];
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
    doc.text(c.address.split("\n").join(", "), 14, 26);
  } else if (tpl === "modern") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 50, doc.internal.pageSize.getHeight(), "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(15);
    doc.text(c.name, 6, 20, { maxWidth: 40 });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(c.address, 6, 40, { maxWidth: 40 });
  } else if (tpl === "elegant") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.5);
    doc.line(14, 14, W - 14, 14);
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(16);
    const elegantNameLines = doc.splitTextToSize(c.name, (W / 2) - 10);
    doc.text(elegantNameLines, 14, 24, { align: "left" });
    const elegantAddrY = 24 + elegantNameLines.length * 7;
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(c.address.split("\n").join(", "), 14, elegantAddrY, { align: "left", maxWidth: (W / 2) - 10 });

    const elegantBottomLine = elegantAddrY + 8;
    doc.setDrawColor(pr, pg, pb); doc.line(14, elegantBottomLine, W - 14, elegantBottomLine);
  } else if (tpl === "bold") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 44, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 44, W, 6, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(28);
    doc.text(c.name.toUpperCase(), 14, 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(", "), 14, 36);

  } else if (tpl === "minimal") {
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(14);
    doc.text(c.name.toUpperCase(), 14, 18);
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(",  "), 14, 25);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.2);
    doc.line(14, 32, W - 14, 32);
  } else if (tpl === "corporate") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 22, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 22, W, 14, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name, 14, 14);
    const [taR, taG, taB] = contrastOn(ar, ag, ab);
    doc.setTextColor(taR, taG, taB); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(", "), 14, 30);
  } else if (tpl === "monochrome") {
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(0, 40, W, 1.2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont(nf, ns); doc.setFontSize(20);
    doc.text(c.name.toUpperCase(), 14, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(",    "), 14, 30);
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
    doc.text(c.address.split("\n").join(",  "), 14, 32);
  } else if (tpl === "geometric") {
    doc.setFillColor(pr, pg, pb); doc.circle(20, 22, 14, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(W - 60, 8, 46, 28, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("INV", 13, 25);
    doc.setTextColor(0, 0, 0); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name.toUpperCase(), 40, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), 40, 27);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.4); doc.line(0, 40, W, 40);
  } else if (tpl === "executive") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(1.2); doc.line(14, 12, W - 14, 12);
    doc.setLineWidth(0.3); doc.line(14, 14.5, W - 14, 14.5);
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(22);
    doc.text(c.name, 14, 26);
    doc.setFont("times", "italic"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text(c.address.split("\n").join(", "), 14, 33);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.6); doc.line(14, 41, W - 14, 41);
  } else if (tpl === "industrial") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 36, "F");
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5); doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(4, 4, W - 8, 28); doc.setLineDashPattern([], 0);
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name.toUpperCase(), 10, 18);
    doc.setFont("courier", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(",  "), 10, 26);

 } else if (tpl === "ribbon") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 16, 26, "F");
    doc.setFillColor(ar, ag, ab); doc.rect(16, 0, 2, 26, "F");
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(20);
    doc.text(c.name, 24, 18, { maxWidth: W - 80 });
    doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), 24, 26, { maxWidth: W - 80 });
  }
  
  else if (tpl === "ledger") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 2, "F");
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name.toUpperCase(), 14, 20);
    doc.setTextColor(90, 90, 90); doc.setFont("courier", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), 14, 28);

    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.25); doc.line(0, 38, W, 38);
  }else if (tpl === "boxed") {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.8);
    doc.rect(8, 6, W - 16, 30);
    doc.line(8, 22, W - 8, 22);
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(18);
    doc.text(c.name, W / 2, 17, { align: "center" });
    doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), W / 2, 30, { align: "center" });

  } else if (tpl === "diagonal") {
    doc.setFillColor(pr, pg, pb);
    doc.triangle(0, 0, W, 0, 0, 38, "F");
    doc.setFillColor(ar, ag, ab);
    doc.triangle(W, 0, W, 38, 0, 38, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(20);
    doc.text(c.name.toUpperCase(), 14, 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), 14, 24);

  } else if (tpl === "stacked") {
    // doc.setFillColor(pr, pg, pb); doc.circle(W / 2, 14, 9, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    // doc.text("EST.", W / 2, 16, { align: "center" });
    doc.setTextColor(...readable(pr, pg, pb)); doc.setFont(nf, ns); doc.setFontSize(17);
    doc.text(c.name, W / 2, 32, { align: "center" });
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), W / 2, 39, { align: "center" });
  }
   else if (tpl === "summary-strip") {
    doc.setFillColor(ar, ag, ab); doc.rect(14, 6, 30, 2, "F");
    doc.setTextColor(30, 30, 30); doc.setFont(nf, ns); doc.setFontSize(22);
    doc.text(c.name, 14, 24);
  } else if (tpl === "corporate-blue") {
    doc.setTextColor(30, 30, 30); doc.setFont(nf, ns); doc.setFontSize(20);
    doc.text(c.name, 14, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
    doc.text(c.address.split("\n").join(", "), 14, 25, { maxWidth: 150 });
    if (c.tax_number) doc.text(`HST: ${c.tax_number}`, 14, 30, { maxWidth: 150 });

  } else if (tpl === "banner-green") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(15);
    doc.text(c.name, 14, 12);
    doc.setTextColor(60, 60, 60); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(c.address.split("\n").join(", "), 14, 26, { maxWidth: 150 });
    if (c.tax_number) doc.text(`HST: ${c.tax_number}`, 14, 31, { maxWidth: 150 });
  }
  
    else {
    // vibrant
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 40, "F");
    doc.setFillColor(ar, ag, ab); doc.triangle(W - 80, 0, W, 0, W, 40, "F");
    doc.setTextColor(tpR, tpG, tpB); doc.setFont(nf, ns); doc.setFontSize(24);
    doc.text(c.name, 14, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(c.address.split("\n").join(",  "), 14, 30);
  }
  doc.setTextColor(0, 0, 0);
}

// Render terms paragraphs with justified text + hanging indent for numbered/bulleted lines.
function justifyLine(doc: jsPDF, line: string, x: number, y: number, maxW: number) {
  const words = line.trim().split(" ");
  if (words.length <= 1) { doc.text(line, x, y); return; }
  const totalWordW = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
  const gap = (maxW - totalWordW) / (words.length - 1);
  let cx = x;
  for (const w of words) {
    doc.text(w, cx, y);
    cx += doc.getTextWidth(w) + gap;
  }
}
function drawDashedLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = [0, 0, 0]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(x1, y1, x2, y2);
  doc.setLineDashPattern([], 0);
}

function gridStyle(tpl: string): "ribbon" | "ledger" | "boxed" | "diagonal" | "default" {
  if (tpl === "ribbon" || tpl === "ledger" || tpl === "boxed" || tpl === "diagonal") return tpl;
  return "default";
}
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
      doc.text(marker, x, y);
      const lines = doc.splitTextToSize(body, maxW - markerW);
      for (let i = 0; i < lines.length; i++) {
        const isLast = i === lines.length - 1;
        if (isLast) {
          doc.text(lines[i], x + markerW, y);
        } else {
          justifyLine(doc, lines[i], x + markerW, y, maxW - markerW);
        }
        y += 4.2;
      }
    } else {
      const lines = doc.splitTextToSize(p, maxW);
      for (let i = 0; i < lines.length; i++) {
        const isLast = i === lines.length - 1;
        if (isLast) {
          doc.text(lines[i], x, y);
        } else {
          justifyLine(doc, lines[i], x, y, maxW);
        }
        y += 4.2;
      }
    }
  }
  return y;
}

function buildSpecialLayoutPdf(doc: jsPDF, invoice: Invoice, items: InvoiceItem[], c: Company, tpl: string) {
  const leftStart = 14;
  const rightEnd = doc.internal.pageSize.getWidth() - 14;
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [ar, ag, ab] = hexToRgb(c.accent_color);
  const [tpR, tpG, tpB] = contrastOn(pr, pg, pb);

  if (tpl === "summary-strip") {
    let yCursor = 38;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("BILL TO", leftStart, yCursor);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    doc.text(invoice.customer_name || "—", leftStart, yCursor + 6);
    const addrLines = doc.splitTextToSize(invoice.customer_address || "", 160);
    doc.text(addrLines, leftStart, yCursor + 12);

    

    const barY = yCursor + 28, barH = 16;
    const tw = rightEnd - leftStart, boxW = tw * 0.23, lastW = tw - boxW * 3;
    const boxes: { label: string; value: string; fill: [number, number, number]; wide?: boolean }[] = [
      { label: "Invoice No.", value: invoice.invoice_number, fill: [ar, ag, ab] },
      { label: "Issue date", value: invoice.invoice_date, fill: [ar, ag, ab] },
      { label: "Due date", value: "", fill: [ar, ag, ab] },
      { label: "Total due", value: fmtMoney(invoice.grand_total), fill: [pr, pg, pb], wide: true },
    ];
    let bx = leftStart;
    boxes.forEach((b) => {
      const w = b.wide ? lastW : boxW;
      const [br, bg, bb] = b.fill;
      doc.setFillColor(br, bg, bb); doc.rect(bx, barY, w, barH, "F");
      const [cr, cg, cb] = contrastOn(br, bg, bb);
      doc.setTextColor(cr, cg, cb); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(b.label, bx + 4, barY + 6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(b.wide ? 12 : 10);
      doc.text(b.value, bx + 4, barY + 13);
      bx += w;
    });
    yCursor = barY + barH + 14;

    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: yCursor,
      margin: { left: leftStart, right: 14 },
      head: [["Description", "Quantity", "Unit price ($)", "Amount ($)"]],
      body: items.map((r) => [r.item_name, r.quantity, fmtMoney(r.unit_price), fmtMoney(r.subtotal)]),
      theme: "plain",
      headStyles: { fontStyle: "bold", textColor: [0, 0, 0], fontSize: 9 },
      styles: { font: "helvetica", fontSize: 9 },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: (data: any) => {
        if (data.section === "head") {
          if (data.column.index === 0) data.cell.styles.halign = "left";
          if (data.column.index === 1) data.cell.styles.halign = "center";
          if (data.column.index === 2) data.cell.styles.halign = "right";
          if (data.column.index === 3) data.cell.styles.halign = "right";
        }
      },
    });
    let y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("Subtotal:", leftStart, y2);
    doc.text(fmtMoney(invoice.total_subtotal), rightEnd, y2, { align: "right" }); y2 += 7;
    doc.setFont("helvetica", "italic"); doc.setTextColor(80, 80, 80);
    doc.text(`HST 13% from ${fmtMoney(invoice.total_subtotal)}`, leftStart, y2);
    doc.text(fmtMoney(invoice.total_gst), rightEnd, y2, { align: "right" }); y2 += 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(0, 0, 0);
    doc.text("Total (CAD):", leftStart, y2);
    doc.text(fmtMoney(invoice.grand_total), rightEnd, y2, { align: "right" });
    drawTermsAndSignature(doc, c, y2 + 12, leftStart, rightEnd);
    return doc;
  }


  if (tpl === "corporate-blue") {
    let yCursor = 38;
    const cbRows: { label: string; value: string }[] = [
      { label: "DATE", value: invoice.invoice_date },
      { label: "INVOICE #", value: invoice.invoice_number },
      { label: "DUE DATE", value: invoice.invoice_date },
    ];
    const cbGap = 4;
    cbRows.forEach(({ label, value }) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      const valW = doc.getTextWidth(value);
      doc.setTextColor(0, 0, 0);
      doc.text(value, rightEnd, yCursor, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
      doc.text(label, rightEnd - valW - cbGap, yCursor, { align: "right" });
      yCursor += 6;
    });

    const billY = 56;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    const billToW = doc.getTextWidth("BILL TO") + 6;
    doc.setFillColor(pr, pg, pb); doc.rect(leftStart, billY, billToW, 7, "F");
    doc.setTextColor(tpR, tpG, tpB);
    doc.text("BILL TO", leftStart + 3, billY + 5, { align: "left" });
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(invoice.customer_name || "—", leftStart, billY + 14);
    doc.setTextColor(80, 80, 80);
    const addrLines = doc.splitTextToSize(invoice.customer_address || "", 150);
    doc.text(addrLines, leftStart, billY + 20);
    let billExtraY = billY + 20 + addrLines.length * 5;
    if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, leftStart, billExtraY); billExtraY += 5; }

    const tableY = Math.max(billY + 36, billExtraY + 6);
    autoTable(doc, {
      startY: tableY,
      margin: { left: leftStart, right: 14 },
      head: [["DESCRIPTION", "QUANTITY", "AMOUNT"]],
      body: items.map((r) => [r.item_name, r.quantity, fmtMoney(r.subtotal)]),
      headStyles: { fillColor: [pr, pg, pb], textColor: [tpR, tpG, tpB], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [238, 240, 244] },
      styles: { font: "helvetica", fontSize: 9 },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "center", cellWidth: 30 }, 2: { halign: "right", cellWidth: 40 } },
      didParseCell: (data: any) => {
        if (data.section === "head") {
          if (data.column.index === 0) data.cell.styles.halign = "left";
          if (data.column.index === 1) data.cell.styles.halign = "center";
          if (data.column.index === 2) data.cell.styles.halign = "right";
        }
      },
    });
    let y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text("Subtotal", rightEnd - 60, y2); doc.setTextColor(0, 0, 0);
    doc.text(fmtMoney(invoice.total_subtotal), rightEnd, y2, { align: "right" }); y2 += 7;
    doc.setTextColor(80, 80, 80);
    doc.text("Tax rate", rightEnd - 60, y2); doc.setTextColor(0, 0, 0);
    doc.text("13.000%", rightEnd, y2, { align: "right" }); y2 += 4;
    doc.setDrawColor(pr, pg, pb); doc.line(rightEnd - 60, y2, rightEnd, y2); y2 += 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(pr, pg, pb);
    doc.text("TOTAL", rightEnd - 60, y2);
    doc.text(fmtMoney(invoice.grand_total), rightEnd, y2, { align: "right" });
    drawTermsAndSignature(doc, c, y2 + 12, leftStart, rightEnd);
    return doc;
  }

  // banner-green

  // banner-green
  let yCursor = 32;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
  doc.text("Date", rightEnd - 75, yCursor);
  doc.setDrawColor(180, 180, 180); doc.rect(rightEnd - 50, yCursor - 5, 50, 7);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoice_date, rightEnd - 47, yCursor); yCursor += 9;
  doc.setTextColor(90, 90, 90);
  doc.text("Invoice #", rightEnd - 75, yCursor);
  doc.setDrawColor(180, 180, 180); doc.rect(rightEnd - 50, yCursor - 5, 50, 7);
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoice_number, rightEnd - 47, yCursor);

  const billY = 46;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  const billToW2 = doc.getTextWidth("Bill To:") + 6;
  doc.setFillColor(pr, pg, pb); doc.rect(leftStart, billY, billToW2, 7, "F");
  doc.setTextColor(tpR, tpG, tpB);
  doc.text("Bill To:", leftStart + 3, billY + 5, { align: "left" });
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(invoice.customer_name || "—", leftStart, billY + 14);
  doc.setTextColor(80, 80, 80);
  const addrLines2 = doc.splitTextToSize(invoice.customer_address || "", 150);
  doc.text(addrLines2, leftStart, billY + 20);
  let billExtraY2 = billY + 20 + addrLines2.length * 5;
  if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, leftStart, billExtraY2); billExtraY2 += 5; }

  const tableY = Math.max(billY + 36, billExtraY2 + 6);
  autoTable(doc, {
    startY: tableY,
    margin: { left: leftStart, right: 14 },
    head: [["Description", "Qty", "Amount"]],
    body: items.map((r) => [r.item_name, r.quantity, fmtMoney(r.subtotal)]),
    headStyles: { fillColor: [pr, pg, pb], textColor: [tpR, tpG, tpB], fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 9, lineWidth: 0.3, lineColor: [180, 180, 180] },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "center", cellWidth: 25 }, 2: { halign: "right", cellWidth: 40 } },
    didParseCell: (data: any) => {
      if (data.section === "head") {
        if (data.column.index === 0) data.cell.styles.halign = "left";
        if (data.column.index === 1) data.cell.styles.halign = "center";
        if (data.column.index === 2) data.cell.styles.halign = "right";
      }
    },
    theme: "grid",
  });
  let y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  doc.text("Subtotal", rightEnd - 60, y2);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtMoney(invoice.total_subtotal), rightEnd, y2, { align: "right" }); y2 += 7;
  doc.setTextColor(60, 60, 60);
  doc.text("Tax Rate", rightEnd - 60, y2);
  doc.setTextColor(0, 0, 0);
  doc.text("13%", rightEnd, y2, { align: "right" }); y2 += 6;
  doc.setFillColor(pr, pg, pb); doc.rect(rightEnd - 60, y2 - 5, 60, 9, "F");
  doc.setTextColor(tpR, tpG, tpB); doc.setFont("helvetica", "bold");
  doc.text("TOTAL", rightEnd - 56, y2 + 1);
  doc.text(fmtMoney(invoice.grand_total), rightEnd, y2 + 1, { align: "right" });
  drawTermsAndSignature(doc, c, y2 + 15, leftStart, rightEnd);
  return doc;
}
function drawTermsAndSignature(doc: jsPDF, c: Company, y: number, leftStart: number, rightEnd: number) {
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();

  if (c.terms) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...readable(pr, pg, pb));
    doc.text("Terms & Conditions", leftStart, y); y += 6;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    y = drawJustifiedTerms(doc, c.terms, leftStart, y, pageW - leftStart - 20);
    y += 4;
  }

  const pos = c.signature_position || "right";
  if (pos !== "none") {
    const pageH = doc.internal.pageSize.getHeight();
    const sigBlockW = 70;
    const sigX = pos === "left" ? leftStart : doc.internal.pageSize.getWidth() - 14 - sigBlockW;
    let sigBaseY = pageH - 30;
    if (y > sigBaseY - 18) { doc.addPage(); sigBaseY = pageH - 30; }
    if (c.signature_url) {
      try {
        const fmt = c.signature_url.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(c.signature_url, fmt, sigX, sigBaseY - 18, 50, 16);
      } catch (e) { console.warn("signature image failed", e); }
    }
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.3); doc.line(sigX, sigBaseY, sigX + sigBlockW, sigBaseY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("Authorized Signature", sigX, sigBaseY + 5);
    doc.text(c.name, sigX, sigBaseY + 10);
  }
  return y;
}
function buildTemplateAPdf(doc: jsPDF, invoice: Invoice, items: InvoiceItem[], c: Company) {
  const W = doc.internal.pageSize.getWidth();
  const leftStart = 14;
  const rightEnd = W - 14;
  const rightColX = leftStart + (rightEnd - leftStart) * 0.55;
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [hr, hg, hb] = readable(pr, pg, pb);       // label / heading colour on white
  const [thr, thg, thb] = contrastOn(pr, pg, pb);  // text colour on the primary fill

  // ---------- HEADER (no logo) ----------
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(hr, hg, hb);
  doc.text((c.name || "Company").toUpperCase(), leftStart, 20);
  let leftHY = 26;
  if (c.address) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(110, 110, 110);
    const aLines = doc.splitTextToSize(c.address.split("\n").join(", "), rightColX - leftStart - 6);
    doc.text(aLines, leftStart, leftHY); leftHY += aLines.length * 4;
  }

  // contact block (top-right): bold coloured label + dark value
  // contact block (top-right): right-aligned label + value, flush to right margin
  let hy = 14;
  const contactRow = (label: string, value?: string) => {
    if (!value) return;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
    const valW = doc.getTextWidth(String(value));
    doc.text(String(value), rightEnd, hy, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setTextColor(hr, hg, hb);
    doc.text(label, rightEnd - valW - 2, hy, { align: "right" });
    hy += 5.5;
  };
  contactRow("HST NUMBER:", c.tax_number);
  contactRow("PHONE:", c.phone);
  contactRow("EMAIL:", c.email);
  if (c.website) contactRow("WEBSITE:", c.website);

  let y = Math.max(leftHY, hy) + 4;
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.line(leftStart, y, rightEnd, y);
  y += 6;

  // ---------- INVOICE # (left) + DATE (right) ----------
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(hr, hg, hb);
  doc.text("BILL TO", leftStart, y);
  y += 3;
  doc.setDrawColor(220, 220, 220); doc.line(leftStart, y, rightEnd, y);
  y += 6;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  let leftY = y;
  doc.text(invoice.customer_name || "—", leftStart, leftY); leftY += 5;
  if (invoice.customer_address) {
    const cleanAddress = invoice.customer_address
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    const lines = doc.splitTextToSize(cleanAddress, rightColX - leftStart - 6);
    doc.text(lines, leftStart, leftY); leftY += lines.length * 5;
  }
  if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, leftStart, leftY); leftY += 5; }
  if (invoice.customer_email) { doc.text(invoice.customer_email, leftStart, leftY); leftY += 5; }

  y = leftY + 6;
  // ---------- ITEMS TABLE: # | DESCRIPTION | QTY | TOTAL ----------
 autoTable(doc, {
    startY: y,
    margin: { left: leftStart, right: 14 },
    head: [["#", "DESCRIPTION", "QTY", "TOTAL"]],
    body: items.map((r, i) => [String(i + 1), r.item_name, String(r.quantity), fmtMoney(r.subtotal)]),
    theme: "plain",
    headStyles: { fillColor: [pr, pg, pb], textColor: [thr, thg, thb], fontStyle: "bold", fontSize: 9 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.6, textColor: [40, 40, 40] },
    columnStyles: {
      0: { halign: "left", cellWidth: 12 },
      1: { halign: "left" },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "right", cellWidth: 34 },
    },
    didParseCell: (data: any) => {
      if (data.section === "head") {
        if (data.column.index === 0) data.cell.styles.halign = "left";
        if (data.column.index === 1) data.cell.styles.halign = "left";
        if (data.column.index === 2) data.cell.styles.halign = "center";
        if (data.column.index === 3) data.cell.styles.halign = "right";
      }
    },
    didDrawCell: (data: any) => {
      if (data.section === "body") {
        doc.setDrawColor(228, 228, 228); doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    },
  });

  let ty = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ---------- TOTALS ----------
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text("Subtotal:", rightEnd - 55, ty);
  doc.text(fmtMoney(invoice.total_subtotal), rightEnd, ty, { align: "right" }); ty += 7;
  doc.text("HST (13%):", rightEnd - 55, ty);
  doc.text(fmtMoney(invoice.total_gst), rightEnd, ty, { align: "right" }); ty += 6;

  // Total Due — light tint of the primary colour
// Total Due — label left, value right-justified inside the box
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  const tdLabel = "Total Due:";
  const tdVal = fmtMoney(invoice.grand_total);
  const padX = 10;
  const boxW = doc.getTextWidth(tdLabel) + doc.getTextWidth(tdVal) + padX * 2 + 24;
  const [lr, lg, lb] = lighten(pr, pg, pb, 0.78);
  doc.setFillColor(lr, lg, lb);
  doc.rect(rightEnd - boxW, ty, boxW, 12, "F");
  doc.setTextColor(20, 20, 20);
  doc.text(tdLabel, rightEnd - boxW + padX, ty + 8);
  doc.text(tdVal, rightEnd, ty + 8, { align: "right" });

  ty += 20;

  if (invoice.amount_paid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
    doc.text("Paid:", rightEnd - 55, ty);
    doc.text(fmtMoney(invoice.amount_paid), rightEnd, ty, { align: "right" }); ty += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Balance:", rightEnd - 55, ty);
    doc.text(fmtMoney(invoice.grand_total - invoice.amount_paid), rightEnd, ty, { align: "right" }); ty += 8;
  }

  // ---------- TERMS & CONDITIONS ----------
  if (c.terms) {
    if (ty > 240) { doc.addPage(); ty = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(hr, hg, hb);
    doc.text("Terms & Conditions", leftStart, ty); ty += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
    ty = drawJustifiedTerms(doc, c.terms, leftStart, ty, W - leftStart - 20);
    ty += 4;
  }

  // ---------- SIGNATURE (respects company setting; "none" hides it) ----------
  const pos = c.signature_position || "right";
  if (pos !== "none") {
    const pageH = doc.internal.pageSize.getHeight();
    const sigBlockW = 70;
    const sigX = pos === "left" ? leftStart : rightEnd - sigBlockW;
    let sigBaseY = pageH - 30;
    if (ty > sigBaseY - 18) { doc.addPage(); sigBaseY = pageH - 30; }
    if (c.signature_url) {
      try {
        const fmt = c.signature_url.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(c.signature_url, fmt, sigX, sigBaseY - 18, 50, 16);
      } catch (e) { console.warn("signature image failed", e); }
    }
   doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.3); doc.line(sigX, sigBaseY, sigX + sigBlockW, sigBaseY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("Authorized Signature", sigX, sigBaseY + 5);
  }

  return doc;
}
function drawCustomItemsLayout(doc: jsPDF, items: InvoiceItem[], c: Company, tpl: string, startY: number, leftStart: number, rightEnd: number): number {
  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [ar, ag, ab] = hexToRgb(c.accent_color);

  if (tpl === "executive") {
    let y = startY;
    doc.setFont("times", "italic"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text("DESCRIPTION", leftStart, y);
    doc.text("AMOUNT", rightEnd, y, { align: "right" });
    y += 2;
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.3); doc.line(leftStart, y, rightEnd, y);
    y += 7;
    items.forEach((r) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      const priceStr = fmtMoney(r.subtotal);
      const priceW = doc.getTextWidth(priceStr);
      const descW = doc.getTextWidth(r.item_name);
      doc.text(r.item_name, leftStart, y);
      doc.text(priceStr, rightEnd, y, { align: "right" });
      const leaderStart = leftStart + descW + 2;
      const leaderEnd = rightEnd - priceW - 2;
      if (leaderEnd > leaderStart) {
        doc.setTextColor(190, 190, 190);
        const dots = ".".repeat(Math.max(0, Math.floor((leaderEnd - leaderStart) / 1.3)));
        doc.text(dots, leaderStart, y);
      }
      y += 5;
      doc.setFont("times", "italic"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
      doc.text(`${r.quantity} x ${fmtMoney(r.unit_price)}`, leftStart, y);
      y += 6;
    });
    doc.setDrawColor(pr, pg, pb); doc.line(leftStart, y, rightEnd, y);
    return y + 2;
  }

  if (tpl === "gradient") {
    let y = startY;
    doc.setFont("courier", "bold"); doc.setFontSize(8); doc.setTextColor(pr, pg, pb);
    doc.text("ITEM", leftStart, y);
    doc.text("QTY", leftStart + 90, y);
    doc.text("RATE", leftStart + 115, y);
    doc.text("AMOUNT", rightEnd, y, { align: "right" });
    y += 4;
    drawDashedLine(doc, leftStart, y, rightEnd, y, [pr, pg, pb]);
    y += 6;
    items.forEach((r) => {
      doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      doc.text(r.item_name, leftStart, y, { maxWidth: 85 });
      doc.text(String(r.quantity), leftStart + 90, y);
      doc.text(fmtMoney(r.unit_price), leftStart + 115, y);
      doc.text(fmtMoney(r.subtotal), rightEnd, y, { align: "right" });
      y += 6;
      drawDashedLine(doc, leftStart, y - 2, rightEnd, y - 2, [210, 210, 210]);
    });
    y += 1;
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.5);
    doc.line(leftStart, y, rightEnd, y);
    doc.line(leftStart, y + 0.8, rightEnd, y + 0.8);
    return y + 4;
  }

  if (tpl === "geometric") {
    let y = startY;
    items.forEach((r) => {
      const blockH = 16;
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
      doc.roundedRect(leftStart, y, rightEnd - leftStart, blockH, 2, 2, "S");
      doc.setFillColor(pr, pg, pb);
      doc.roundedRect(leftStart, y, 3, blockH, 1, 1, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      doc.text(r.item_name, leftStart + 8, y + 7);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
      doc.text(`Qty ${r.quantity}  x  ${fmtMoney(r.unit_price)}`, leftStart + 8, y + 12.5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(pr, pg, pb);
      doc.text(fmtMoney(r.subtotal), rightEnd - 4, y + 9.5, { align: "right" });
      y += blockH + 4;
    });
    return y;
  }

  if (tpl === "ledger") {
    let y = startY;
    doc.setFont("courier", "bold"); doc.setFontSize(8); doc.setTextColor(pr, pg, pb);
    doc.text("ITEMS PURCHASED", leftStart, y);
    y += 6;
    items.forEach((r, i) => {
      doc.setFont("courier", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      doc.text(r.item_name, leftStart, y);
      doc.text(fmtMoney(r.subtotal), rightEnd, y, { align: "right" });
      y += 4.5;
      doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text(`${r.quantity} unit(s) @ ${fmtMoney(r.unit_price)}`, leftStart, y);
      y += 5;
      if (i < items.length - 1) {
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2);
        doc.line(leftStart, y, rightEnd, y);
        y += 3;
      }
    });
    return y + 2;
  }

  if (tpl === "diagonal") {
    let y = startY;
    items.forEach((r) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
      doc.text(r.item_name, leftStart, y);
      doc.text(fmtMoney(r.subtotal), rightEnd, y, { align: "right" });
      y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(ar, ag, ab);
      doc.text(`${r.quantity} x ${fmtMoney(r.unit_price)}`, leftStart, y);
      y += 7;
    });
    return y;
  }

  if (tpl === "stacked") {
    let y = startY + 2;
    const lineX = leftStart + 2;
    items.forEach((r, i) => {
      doc.setFillColor(pr, pg, pb);
      doc.circle(lineX, y - 1.5, 1.2, "F");
      if (i < items.length - 1) {
        doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.3);
        doc.line(lineX, y, lineX, y + 11);
      }
      doc.setFont("times", "bold"); doc.setFontSize(9.5); doc.setTextColor(0, 0, 0);
      doc.text(r.item_name, lineX + 6, y);
      doc.text(fmtMoney(r.subtotal), rightEnd, y, { align: "right" });
      y += 5;
      doc.setFont("times", "italic"); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
      doc.text(`${r.quantity} x ${fmtMoney(r.unit_price)}`, lineX + 6, y);
      y += 8;
    });
    return y;
  }

  return startY;
}

export function buildInvoicePdf(invoice: Invoice, items: InvoiceItem[], company: Company | null) {
  const tpl = company?.design_template || "classic";
  const c: Company = company || {
    id: "", name: "Company", address: "", phone: "", email: "", tax_number: "", logo_url: "",
    primary_color: "#0f1b3d", accent_color: "#c9a84c", font_family: "helvetica",
    design_template: "classic", terms: "", created_at: "", role: "both",
  };
  const doc = new jsPDF();

  if (tpl === "template-a") {
    return buildTemplateAPdf(doc, invoice, items, c);
  }

  if (tpl === "custom") {
    return buildCustomInvoicePdf(invoice, items, c, (c.custom_layout as never) || undefined);
  }

  drawHeader(doc, c, tpl);

if (tpl === "summary-strip" || tpl === "corporate-blue" || tpl === "banner-green") {
    return buildSpecialLayoutPdf(doc, invoice, items, c, tpl);
  }

  const leftStart = tpl === "modern" ? 56 : 14;
  const rightEnd = doc.internal.pageSize.getWidth() - 14;
  const startY = tpl === "modern" ? 50 : tpl === "elegant" ? 0 : tpl === "bold" ? 58 : tpl === "executive" ? 48 : 42;




  const [pr, pg, pb] = hexToRgb(c.primary_color);
  const [ar, ag, ab] = hexToRgb(c.accent_color);
  const [tpR, tpG, tpB] = contrastOn(pr, pg, pb);
  const [lr, lg, lb] = readable(pr, pg, pb);

  // Seller contact details — right-aligned, parallel to seller name in header
  // NEW
// NEW
// NEW (renamed)
const darkHeaderTpls = ["classic", "bold", "corporate", "monochrome", "gradient", "industrial", "vibrant"];
const sellerTextColor: [number, number, number] = darkHeaderTpls.includes(tpl) ? [tpR, tpG, tpB] : [80, 80, 80];
doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...sellerTextColor);
const contactStartY = tpl === "modern" ? 20 : tpl === "elegant" ? 22 : tpl === "bold" ? 18 : tpl === "corporate" ? 10 : tpl === "classic" ? 14 : tpl === "executive" ? 22 : tpl === "monochrome" ? 18 : tpl === "gradient" ? 18 : tpl === "geometric" ? 18 : tpl === "industrial" ? 14 : tpl === "minimal" ? 14 : tpl === "boxed" ? 13 : 18;

let sellerRY = contactStartY;

const sellerRows: { label: string; value: string }[] = [];
if (c.phone) sellerRows.push({ label: "Phone:", value: c.phone });
if (c.email) sellerRows.push({ label: "Email:", value: c.email });
if (c.tax_number) sellerRows.push({ label: "HST:", value: c.tax_number });
if (c.website) sellerRows.push({ label: "Web:", value: c.website });

const socialLines: string[] = c.social_links ? doc.splitTextToSize(c.social_links, 80) : [];

// NEW
const maxValueW = Math.max(0, ...sellerRows.map((r) => doc.getTextWidth(r.value)));
const gap = 4;
const sellerLabelX = rightEnd - maxValueW - gap; // tight column — Phone/Email/HST/Web only

sellerRows.forEach(({ label, value }) => {
  doc.text(label, sellerLabelX, sellerRY, { align: "right" });
  doc.text(value, rightEnd, sellerRY, { align: "right" });
  sellerRY += 4;
});

if (c.social_links) {
  const maxLineW = Math.max(...socialLines.map((l: string) => doc.getTextWidth(l)));
  const socialLabelX = rightEnd - maxLineW - gap; // own column — long URL won't drag the others left
  doc.text("Social:", socialLabelX, sellerRY, { align: "right" });
  doc.text(socialLines, rightEnd, sellerRY, { align: "right" });
  sellerRY += socialLines.length * 4;
}
doc.setTextColor(0, 0, 0);
  // Invoice # (left) — single line
  const elegantBottomLineY = (() => {
  if (tpl !== "elegant") return 0;
  doc.setFont("times", "bolditalic"); doc.setFontSize(16);
  const lines = doc.splitTextToSize(c.name, (doc.internal.pageSize.getWidth() / 2) - 10);
  const addrY = 24 + lines.length * 7;
  return addrY + 8;
})();
const metaY = tpl === "elegant"
  ? Math.max(sellerRY, elegantBottomLineY) + 8
  : tpl === "gradient" || tpl === "vibrant"
  ? Math.max(sellerRY, startY) + 8
  : Math.max(sellerRY, startY) + 2;
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
  const toY = metaY + 6;
  doc.setFont("helvetica", "bold"); doc.setTextColor(lr, lg, lb); doc.setFontSize(10);
  doc.text("BILL TO", leftStart, toY);

  // Blank line, then name
  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  let nameY = toY + 5;
  doc.text(invoice.customer_name || "—", leftStart, nameY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  let yCursor = nameY + 4;
  if (invoice.customer_address) {
    const cleanAddress = invoice.customer_address
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    const lines = doc.splitTextToSize(cleanAddress, 100);
    doc.text(lines, leftStart, yCursor); yCursor += lines.length * 4;
  }
  if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, leftStart, yCursor); yCursor += 4; }
  // Right column (parallel) — contact & email
  // NEW
  // Right column (parallel) — contact & email
  let rCursor = nameY;
  const custRows: { label: string; value: string }[] = [];
  if (invoice.customer_contact) custRows.push({ label: "Phone:", value: invoice.customer_contact });
  if (invoice.customer_email) custRows.push({ label: "Email:", value: invoice.customer_email });
  const custMaxValueW = Math.max(0, ...custRows.map((r) => doc.getTextWidth(r.value)));
  const custLabelX = rightEnd - custMaxValueW - 4;
  custRows.forEach(({ label, value }) => {
    doc.text(label, custLabelX, rCursor, { align: "right" });
    doc.text(value, rightEnd, rCursor, { align: "right" });
    rCursor += 4;
  });
   yCursor = Math.max(yCursor, rCursor);

  const customLayoutTpls = ["executive", "gradient", "geometric", "ledger", "diagonal", "stacked"];
  let itemsFinalY: number;

  if (customLayoutTpls.includes(tpl)) {
    itemsFinalY = drawCustomItemsLayout(doc, items, c, tpl, yCursor + 8, leftStart, rightEnd);
  } else {
  let tableTheme: "striped" | "grid" | "plain" = "striped";
  let headFill: [number, number, number] = [pr, pg, pb];
  let headText: [number, number, number] = [tpR, tpG, tpB];
  let altRow: [number, number, number] =
    tpl === "vibrant" ? [255, 245, 240] : tpl === "modern" ? [240, 248, 245] : [245, 243, 238];
  let rowLineColor: [number, number, number] = [220, 220, 220];
  let rowLineWidth = 0;
  let bodyFont: "helvetica" | "courier" | "times" = "helvetica";

  if (tpl === "classic") {
    tableTheme = "grid";
    rowLineColor = [pr, pg, pb];
    rowLineWidth = 0.15;
  } else if (tpl === "modern") {
    tableTheme = "plain";
    headFill = [255, 255, 255];
    headText = [pr, pg, pb];
    rowLineColor = [pr, pg, pb];
    rowLineWidth = 0.4;
    altRow = [255, 255, 255];
  } else if (tpl === "minimal") {
    tableTheme = "plain";
    headFill = [255, 255, 255];
    headText = [40, 40, 40];
    altRow = [255, 255, 255];
    rowLineColor = [30, 30, 30];
    rowLineWidth = 0.3;
  } else if (tpl === "monochrome") {
    tableTheme = "grid";
    headFill = [0, 0, 0];
    headText = [255, 255, 255];
    altRow = [255, 255, 255];
    rowLineColor = [0, 0, 0];
    rowLineWidth = 0.2;
    bodyFont = "courier";
  } else if (tpl === "industrial") {
    tableTheme = "grid";
    rowLineColor = [ar, ag, ab];
    rowLineWidth = 0.3;
    bodyFont = "courier";
  } else if (tpl === "elegant") {
    tableTheme = "plain";
    headFill = [255, 255, 255];
    headText = [pr, pg, pb];
    altRow = [255, 255, 255];
    rowLineColor = [pr, pg, pb];
    rowLineWidth = 0.2;
    bodyFont = "times";
  } else if (tpl === "bold") {
    tableTheme = "grid";
    rowLineColor = [pr, pg, pb];
    rowLineWidth = 0.6;
  } else if (tpl === "corporate") {
    tableTheme = "striped";
    altRow = lighten(ar, ag, ab, 0.75);
    rowLineColor = [255, 255, 255];
    rowLineWidth = 0;
  } else if (tpl === "ribbon") {
    tableTheme = "plain";
    headFill = [255, 255, 255];
    headText = [pr, pg, pb];
    altRow = [255, 255, 255];
    rowLineColor = [200, 200, 200];
    rowLineWidth = 0.25;
  } else if (tpl === "boxed") {
    tableTheme = "grid";
    rowLineColor = [pr, pg, pb];
    rowLineWidth = 0.5;
  }

  // NEW
  autoTable(doc, {
    startY: yCursor + 6,
    margin: { left: leftStart, right: 14 },
    head: [[
      { content: "Description", styles: { halign: "left" } },
      { content: "Qty", styles: { halign: "center" } },
      { content: "Rate", styles: { halign: "right" } },
      { content: "Total", styles: { halign: "right" } },
    ]],
    didParseCell: (data: any) => {
      if (data.column.index === 0) data.cell.styles.halign = "left";
      if (data.column.index === 1) data.cell.styles.halign = "center";
      if (data.column.index === 2) data.cell.styles.halign = "right";
      if (data.column.index === 3) data.cell.styles.halign = "right";
    },
    body: items.map((r) => [
      r.item_name, r.quantity,
      fmtMoney(r.unit_price), fmtMoney(r.subtotal),
    ]),
    theme: tableTheme,
    headStyles: { fillColor: headFill, textColor: headText, fontStyle: "bold", valign: "middle", cellPadding: { top: 3, right: 3, bottom: 3, left: 3 } },
    alternateRowStyles: { fillColor: altRow },
    styles: { font: bodyFont, fontSize: 9, cellPadding: { top: 3, right: 3, bottom: 3, left: 3 }, lineColor: rowLineColor, lineWidth: rowLineWidth },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "right", cellWidth: 42 },
      3: { halign: "right", cellWidth: 42 },
},
   tableWidth: "auto",
  });

  itemsFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  let y = itemsFinalY + 8;
  // Totals — right-aligned at the right table edge
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text(`Subtotal:  ${fmtMoney(invoice.total_subtotal)}`, rightEnd, y, { align: "right" }); y += 6;
  doc.text(`HST (13%):  ${fmtMoney(invoice.total_gst)}`, rightEnd, y, { align: "right" }); y += 8;

  // Total Due bar — width sized to its text, right-edge aligned to rightEnd
// Total Due bar — label left, value right-justified inside the box
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  const tdLabel = "Total Due:";
  const tdVal = fmtMoney(invoice.grand_total);
  const tdW = doc.getTextWidth(tdLabel) + doc.getTextWidth(tdVal) + 30;
  doc.setFillColor(pr, pg, pb);
  doc.rect(rightEnd - tdW, y - 5, tdW, 9, "F");
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(tdLabel, rightEnd - tdW + 6, y + 1);
  doc.text(tdVal, rightEnd, y + 1, { align: "right" });
  doc.setTextColor(0, 0, 0); y += 10;

  if (invoice.amount_paid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Paid:  ${fmtMoney(invoice.amount_paid)}`, rightEnd, y, { align: "right" }); y += 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(ar, ag, ab);
    doc.text(`Balance:  ${fmtMoney(invoice.grand_total - invoice.amount_paid)}`, rightEnd, y, { align: "right" });
    doc.setTextColor(0, 0, 0); y += 8;
  }

   y = Math.max(y, itemsFinalY + 30);

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
