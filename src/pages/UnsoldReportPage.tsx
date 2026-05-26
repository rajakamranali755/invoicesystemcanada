import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/lib/types";
import { fmtMoney, COMPANY_NAME } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, FileDown, FileSpreadsheet, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function UnsoldReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [taxYear, setTaxYear] = useState<string>("");
  const [lastTaxDate, setLastTaxDate] = useState<string>("");

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return items
      .filter((i) => {
        if (from && i.created_at < from) return false;
        if (to && i.created_at > to + "T23:59:59") return false;
        if (taxYear) {
          const y = new Date(i.created_at).getFullYear().toString();
          if (y !== taxYear) return false;
        }
        if (lastTaxDate) {
          // Only items added AFTER the last filed tax date (not yet claimed)
          if (i.created_at <= lastTaxDate + "T23:59:59") return false;
        }
        if (q && !i.name.toLowerCase().includes(q) && !i.serial_number.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((i) => {
        const remaining = Math.max(i.quantity_available - i.sold_quantity, 0);
        const value = remaining * Number(i.price);
        const gstReclaim = (value * Number(i.gst_percent)) / 100;
        return { ...i, remaining, value, gstReclaim };
      });
  }, [items, from, to, search]);

  const totals = useMemo(() => {
    const val = rows.reduce((s, r) => s + r.value, 0);
    const gst = rows.reduce((s, r) => s + r.gstReclaim, 0);
    return { val, gst };
  }, [rows]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const i of items) years.add(new Date(i.created_at).getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [items]);

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text(COMPANY_NAME, 14, 14);
    doc.setFontSize(12); doc.text("Unsold Items Report (GST Reclaim)", 14, 22);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Range: ${from || "Any"} - ${to || "Any"}`, 14, 28);
    autoTable(doc, {
      startY: 32,
      head: [["Item ID", "Serial", "Name", "Orig Qty", "Sold", "Remaining", "Price", "GST %", "Unsold Value", "GST Reclaim"]],
      body: rows.map((r) => [
        r.id.slice(0, 8), r.serial_number, r.name, r.quantity_available, r.sold_quantity,
        r.remaining, fmtMoney(r.price), `${r.gst_percent}%`, fmtMoney(r.value), fmtMoney(r.gstReclaim),
      ]),
      foot: [["", "", "", "", "", "", "", "TOTAL", fmtMoney(totals.val), fmtMoney(totals.gst)]],
      styles: { fontSize: 8 },
    });
    doc.save("unsold-items-report.pdf");
  };

  const exportXlsx = () => {
    const data = rows.map((r) => ({
      "Item ID": r.id,
      "Serial Number": r.serial_number,
      "Item Name": r.name,
      "Original Quantity": r.quantity_available,
      "Sold Quantity": r.sold_quantity,
      "Remaining Quantity": r.remaining,
      "Price": Number(r.price),
      "GST %": Number(r.gst_percent),
      "Total Unsold Value": r.value,
      "GST Reclaimable": r.gstReclaim,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unsold");
    XLSX.writeFile(wb, "unsold-items-report.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unsold Items Report</h2>
          <p className="text-sm text-muted-foreground">For GST reclaim from government.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          <Button variant="outline" onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
          <Button onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div><Label>From (date added)</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Tax Year</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
            >
              <option value="">All years</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <Label>Last Tax Filing Date</Label>
            <Input type="date" value={lastTaxDate} onChange={(e) => setLastTaxDate(e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">Shows only items added after this date.</p>
          </div>
          <div className="lg:col-span-2">
            <Label>Search</Label>
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Name or serial #" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">{COMPANY_NAME}</h1>
            <p className="text-sm">Unsold Items Report</p>
          </div>
          <CardTitle>Items ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item ID</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Orig</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Remain</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">GST %</TableHead>
                <TableHead className="text-right">Unsold Value</TableHead>
                <TableHead className="text-right">GST Reclaim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.serial_number}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.quantity_available}</TableCell>
                  <TableCell className="text-right">{r.sold_quantity}</TableCell>
                  <TableCell className="text-right font-semibold">{r.remaining}</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.price)}</TableCell>
                  <TableCell className="text-right">{r.gst_percent}%</TableCell>
                  <TableCell className="text-right">{fmtMoney(r.value)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{fmtMoney(r.gstReclaim)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-secondary font-semibold">
                <TableCell colSpan={8} className="text-right">TOTAL</TableCell>
                <TableCell className="text-right">{fmtMoney(totals.val)}</TableCell>
                <TableCell className="text-right text-primary">{fmtMoney(totals.gst)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}