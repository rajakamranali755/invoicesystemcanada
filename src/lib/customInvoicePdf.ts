import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney, type Invoice, type InvoiceItem, type Company, type CustomLayout, type ItemsTableStyle, DEFAULT_CUSTOM_LAYOUT } from "@/lib/types";

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#000000").replace("#", "");
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}
function contrastOn(r: number, g: number, b: number): [number, number, number] {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.6 ? [255, 255, 255] : [0, 0, 0];
}
function lighten(r: number, g: number, b: number, amt: number): [number, number, number] {
  return [Math.round(r + (255 - r) * amt), Math.round(g + (255 - g) * amt), Math.round(b + (255 - b) * amt)];
}

function tableTheme(style: ItemsTableStyle, primary: [number, number, number], onPrimary: [number, number, number]) {
  const [pr, pg, pb] = primary;
  switch (style) {
    case "compact":
      return {
        theme: "plain" as const,
        headStyles: { fillColor: primary, textColor: onPrimary, fontStyle: "bold" as const, fontSize: 9, cellPadding: 2 },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.6 },
        alternateRowStyles: undefined,
      };
    case "zebra":
      return {
        theme: "plain" as const,
        headStyles: { fillColor: primary, textColor: onPrimary, fontStyle: "bold" as const, fontSize: 9, cellPadding: 3 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: lighten(pr, pg, pb, 0.9) },
      };
    case "bordered":
      return {
        theme: "grid" as const,
        headStyles: { fillColor: primary, textColor: onPrimary, fontStyle: "bold" as const, fontSize: 9, cellPadding: 3, lineWidth: 0.2, lineColor: [180, 180, 180] },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3, lineWidth: 0.2, lineColor: [200, 200, 200] },
        alternateRowStyles: undefined,
      };
    case "minimal":
      return {
        theme: "plain" as const,
        headStyles: { textColor: [40, 40, 40] as [number, number, number], fontStyle: "bold" as const, fontSize: 9, cellPadding: { top: 2, right: 3, bottom: 4, left: 3 }, lineWidth: { bottom: 0.4 }, lineColor: primary },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3, lineWidth: { bottom: 0.1 }, lineColor: [220, 220, 220] as [number, number, number] },
        alternateRowStyles: undefined,
      };
    case "boxed":
      return {
        theme: "grid" as const,
        headStyles: { fillColor: primary, textColor: onPrimary, fontStyle: "bold" as const, fontSize: 10, cellPadding: 4, lineWidth: 0.5, lineColor: primary },
        styles: { font: "helvetica", fontSize: 9.5, cellPadding: 4, lineWidth: 0.4, lineColor: primary },
        alternateRowStyles: undefined,
      };
    case "spacious":
      return {
        theme: "plain" as const,
        headStyles: { fillColor: primary, textColor: onPrimary, fontStyle: "bold" as const, fontSize: 10, cellPadding: 5 },
        styles: { font: "helvetica", fontSize: 10, cellPadding: 5 },
        alternateRowStyles: { fillColor: [248, 248, 248] as [number, number, number] },
      };
  }
}

export function buildCustomInvoicePdf(
  invoice: Invoice,
  items: InvoiceItem[],
  company: Company,
  layoutIn?: CustomLayout,
): jsPDF {
  const layout: CustomLayout = { ...DEFAULT_CUSTOM_LAYOUT, ...(layoutIn || {}) };
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const leftStart = 14;
  const rightEnd = W - 14;

  const primary = hexToRgb(company.primary_color || "#0f1b3d");
  const accent = hexToRgb(company.accent_color || "#c9a84c");
  const onPrimary = contrastOn(...primary);
  const [pr, pg, pb] = primary;
  const [tpR, tpG, tpB] = onPrimary;

  // ---------- HEADER ----------
  let headerBottom = 14;
  if (layout.headerStyle === "solid") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 34, "F");
    doc.setFillColor(accent[0], accent[1], accent[2]); doc.rect(0, 34, W, 2, "F");
    headerBottom = 40;
  } else if (layout.headerStyle === "stripe") {
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, W, 4, "F");
    doc.setFillColor(accent[0], accent[1], accent[2]); doc.rect(0, 4, W, 1.5, "F");
    headerBottom = 12;
  } else {
    headerBottom = 8;
  }

  const nameColor: [number, number, number] = layout.headerStyle === "solid" ? [tpR, tpG, tpB] : [pr, pg, pb];
  const subColor: [number, number, number] = layout.headerStyle === "solid" ? [tpR, tpG, tpB] : [80, 80, 80];
  const alignX = layout.headerAlign === "center" ? W / 2 : layout.headerAlign === "right" ? rightEnd : leftStart;
  const alignOpt = { align: layout.headerAlign || "left" } as const;

  doc.setTextColor(...nameColor);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text(company.name || "Company", alignX, layout.headerStyle === "solid" ? 18 : 16, alignOpt);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...subColor);
  const addrLine = (company.address || "").split("\n").filter(Boolean).join(", ");
  if (addrLine) doc.text(addrLine, alignX, layout.headerStyle === "solid" ? 26 : 22, alignOpt);

  doc.setTextColor(0, 0, 0);

  // ---------- SELLER CONTACT ----------
  const sellerRows: { label: string; value: string }[] = [];
  if (company.phone) sellerRows.push({ label: "Phone:", value: company.phone });
  if (company.email) sellerRows.push({ label: "Email:", value: company.email });
  if (company.tax_number) sellerRows.push({ label: "HST:", value: company.tax_number });
  if (company.website) sellerRows.push({ label: "Web:", value: company.website });

  let contactBottom = headerBottom;
  if (layout.sellerContact !== "hidden" && sellerRows.length) {
    const useTopRight = layout.sellerContact === "top-right" && layout.headerAlign !== "right";
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    if (useTopRight) {
      doc.setTextColor(...(layout.headerStyle === "solid" ? [tpR, tpG, tpB] as [number, number, number] : [60, 60, 60] as [number, number, number]));
      let y = 14;
      const maxValW = Math.max(...sellerRows.map((r) => doc.getTextWidth(r.value)));
      const labelX = rightEnd - maxValW - 4;
      sellerRows.forEach(({ label, value }) => {
        doc.text(label, labelX, y, { align: "right" });
        doc.text(value, rightEnd, y, { align: "right" });
        y += 4;
      });
    } else {
      // below-header
      doc.setTextColor(60, 60, 60);
      let y = headerBottom + 4;
      const line = sellerRows.map((r) => `${r.label} ${r.value}`).join("   ·   ");
      doc.text(line, leftStart, y, { maxWidth: W - 28 });
      contactBottom = y + 5;
    }
  }
  doc.setTextColor(0, 0, 0);

  // ---------- INVOICE META ----------
  const metaY = Math.max(contactBottom, headerBottom) + 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(pr, pg, pb);
  const metaLabel = "INVOICE # ";
  const dateLabel = "INVOICE DATE ";

  if (layout.invoiceMeta === "both-left") {
    doc.text(metaLabel, leftStart, metaY);
    const w1 = doc.getTextWidth(metaLabel);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    doc.text(invoice.invoice_number, leftStart + w1, metaY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(pr, pg, pb);
    doc.text(dateLabel, leftStart, metaY + 6);
    doc.setTextColor(0, 0, 0); doc.setFontSize(11);
    doc.text(invoice.invoice_date, leftStart + doc.getTextWidth(dateLabel), metaY + 6);
  } else if (layout.invoiceMeta === "both-right") {
    const numW = doc.getTextWidth(invoice.invoice_number);
    const dateW = doc.getTextWidth(invoice.invoice_date);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    doc.text(invoice.invoice_number, rightEnd, metaY, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(pr, pg, pb);
    doc.text(metaLabel.trim(), rightEnd - numW - 2, metaY, { align: "right" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11);
    doc.text(invoice.invoice_date, rightEnd, metaY + 6, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(pr, pg, pb);
    doc.text(dateLabel.trim(), rightEnd - dateW - 2, metaY + 6, { align: "right" });
  } else {
    // split
    doc.text(metaLabel, leftStart, metaY);
    const w1 = doc.getTextWidth(metaLabel);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    doc.text(invoice.invoice_number, leftStart + w1, metaY);
    const dateW = doc.getTextWidth(invoice.invoice_date);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(invoice.invoice_date, rightEnd, metaY, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(pr, pg, pb);
    doc.text("INVOICE DATE", rightEnd - dateW - 3, metaY, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);

  // ---------- BILL TO + CUSTOMER CONTACT ----------
  const blockY = metaY + 12;
  const billLeftSide = layout.billTo === "left";
  const billX = billLeftSide ? leftStart : rightEnd;
  const billAlign = billLeftSide ? "left" : "right";
  const contactSide = layout.customerContact === "hidden"
    ? null
    : layout.customerContact === "below-billto"
      ? billAlign
      : (billLeftSide ? "right" : "left");

  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(pr, pg, pb);
  doc.text("BILL TO", billX, blockY, { align: billAlign });

  doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  let bY = blockY + 6;
  doc.text(invoice.customer_name || "—", billX, bY, { align: billAlign }); bY += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  if (invoice.customer_address) {
    const addrClean = invoice.customer_address.split("\n").map((s) => s.trim()).filter(Boolean).join(", ");
    const lines = doc.splitTextToSize(addrClean, 100);
    doc.text(lines, billX, bY, { align: billAlign }); bY += lines.length * 4.5;
  }
  if (invoice.customer_tax_number) { doc.text(`HST: ${invoice.customer_tax_number}`, billX, bY, { align: billAlign }); bY += 4.5; }

  let cY = bY;
  if (contactSide) {
    const custRows: { label: string; value: string }[] = [];
    if (invoice.customer_contact) custRows.push({ label: "Phone:", value: invoice.customer_contact });
    if (invoice.customer_email) custRows.push({ label: "Email:", value: invoice.customer_email });
    if (custRows.length) {
      if (layout.customerContact === "below-billto") {
        cY = bY + 2;
        custRows.forEach(({ label, value }) => {
          doc.text(`${label} ${value}`, billX, cY, { align: billAlign });
          cY += 4;
        });
      } else {
        const isRight = contactSide === "right";
        const cx = isRight ? rightEnd : leftStart;
        let ry = blockY + 6;
        const maxValW = Math.max(...custRows.map((r) => doc.getTextWidth(r.value)));
        const labelX = isRight ? rightEnd - maxValW - 4 : leftStart;
        const valX = isRight ? rightEnd : leftStart + doc.getTextWidth("Phone:") + 4;
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(pr, pg, pb);
        doc.text("CONTACT", cx, blockY, { align: isRight ? "right" : "left" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
        custRows.forEach(({ label, value }) => {
          if (isRight) {
            doc.text(label, labelX, ry, { align: "right" });
            doc.text(value, rightEnd, ry, { align: "right" });
          } else {
            doc.text(label, leftStart, ry);
            doc.text(value, valX, ry);
          }
          ry += 4.5;
        });
        cY = ry;
      }
    }
  }

  const tableStartY = Math.max(bY, cY) + 8;

  // ---------- ITEMS TABLE ----------
  const theme = tableTheme(layout.itemsTable || "zebra", primary, onPrimary);
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: leftStart, right: 14 },
    head: [[
      { content: "Description", styles: { halign: "left" } },
      { content: "Qty", styles: { halign: "center" } },
      { content: "Rate", styles: { halign: "right" } },
      { content: "Total", styles: { halign: "right" } },
    ]],
    body: items.map((r) => [r.item_name, r.quantity, fmtMoney(r.unit_price), fmtMoney(r.subtotal)]),
    theme: theme.theme,
    headStyles: theme.headStyles,
    styles: theme.styles,
    alternateRowStyles: theme.alternateRowStyles,
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "right", cellWidth: 42 },
      3: { halign: "right", cellWidth: 42 },
    },
  });

  // ---------- TOTALS ----------
  let ty = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const totalsRight = (layout.totals || "right") === "right";
  const anchor = totalsRight ? rightEnd : leftStart + 90;
  const anchorAlign = totalsRight ? "right" : "right";

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  doc.text(`Subtotal:  ${fmtMoney(invoice.total_subtotal)}`, anchor, ty, { align: anchorAlign }); ty += 6;
  doc.text(`HST (13%):  ${fmtMoney(invoice.total_gst)}`, anchor, ty, { align: anchorAlign }); ty += 8;

  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  const tdLabel = "Total Due:";
  const tdVal = fmtMoney(invoice.grand_total);
  const tdW = doc.getTextWidth(tdLabel) + doc.getTextWidth(tdVal) + 30;
  doc.setFillColor(pr, pg, pb);
  const boxX = totalsRight ? anchor - tdW : leftStart;
  doc.rect(boxX, ty - 5, tdW, 9, "F");
  doc.setTextColor(tpR, tpG, tpB);
  doc.text(tdLabel, boxX + 6, ty + 1);
  doc.text(tdVal, boxX + tdW - 4, ty + 1, { align: "right" });
  doc.setTextColor(0, 0, 0); ty += 12;

  if (invoice.amount_paid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Paid:  ${fmtMoney(invoice.amount_paid)}`, anchor, ty, { align: anchorAlign }); ty += 6;
    doc.setFont("helvetica", "bold"); doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(`Balance:  ${fmtMoney(invoice.grand_total - invoice.amount_paid)}`, anchor, ty, { align: anchorAlign });
    doc.setTextColor(0, 0, 0); ty += 8;
  }

  // ---------- TERMS ----------
  if (company.terms) {
    if (ty > 240) { doc.addPage(); ty = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(pr, pg, pb);
    doc.text("Terms & Conditions", leftStart, ty); ty += 6;
    doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const lines = doc.splitTextToSize(company.terms, W - leftStart - 20);
    doc.text(lines, leftStart, ty);
    ty += lines.length * 4;
  }

  // ---------- SIGNATURE ----------
  const sig = layout.signature || "right";
  if (sig !== "none") {
    const sigBlockW = 70;
    const sigX = sig === "left" ? leftStart : rightEnd - sigBlockW;
    const sigBaseY = H - 30;
    if (company.signature_url) {
      try {
        const fmt = company.signature_url.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(company.signature_url, fmt, sigX, sigBaseY - 18, 50, 16);
      } catch (e) { console.warn("signature image failed", e); }
    }
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.3); doc.line(sigX, sigBaseY, sigX + sigBlockW, sigBaseY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text("Authorized Signature", sigX, sigBaseY + 5);
  }

  return doc;
}