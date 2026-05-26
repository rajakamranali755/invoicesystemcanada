import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { openInvoicePdf } from "@/lib/invoicePdf";

interface Row {
  key: string;
  item_id: string | null;
  item_name: string;
  serial_number: string;
  quantity: number;
  unit_price: number;
  gst_mode: "percent" | "amount";
  gst_value: number;
  available: number;
}

const newRow = (): Row => ({
  key: Math.random().toString(36).slice(2),
  item_id: null, item_name: "", serial_number: "",
  quantity: 1, unit_price: 0, gst_mode: "percent", gst_value: 0,
  available: 0,
});

function calcRow(r: Row) {
  const subtotal = r.quantity * r.unit_price;
  const gst = r.gst_mode === "percent" ? (subtotal * r.gst_value) / 100 : r.gst_value;
  return { subtotal, gst, total: subtotal + gst };
}

export function SalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return data as Item[];
    },
  });

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const onPickItem = (key: string, itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    // Auto 10% markup on the dashboard (purchase) price
    const sellingPrice = Number((Number(it.price) * 1.1).toFixed(2));
    updateRow(key, {
      item_id: it.id,
      item_name: it.name,
      serial_number: it.serial_number,
      unit_price: sellingPrice,
      gst_mode: "percent",
      gst_value: Number(it.gst_percent),
      available: it.quantity_available - it.sold_quantity,
      quantity: 1,
    });
  };

  const totals = useMemo(() => {
    let q = 0, sub = 0, gst = 0, grand = 0;
    for (const r of rows) {
      const c = calcRow(r);
      q += r.quantity; sub += c.subtotal; gst += c.gst; grand += c.total;
    }
    return { q, sub, gst, grand };
  }, [rows]);

  const save = useMutation({
    mutationFn: async () => {
      const validRows = rows.filter((r) => r.item_id && r.quantity > 0);
      if (validRows.length === 0) throw new Error("Add at least one item.");
      for (const r of validRows) {
        if (r.quantity > r.available) {
          throw new Error(`${r.item_name}: only ${r.available} in stock.`);
        }
      }
      const { data: numRow, error: nErr } = await supabase.rpc("generate_invoice_number");
      if (nErr) throw nErr;
      const invoice_number = numRow as unknown as string;

      const { data: inv, error: iErr } = await supabase.from("invoices").insert({
        invoice_number,
        customer_name: customerName,
        customer_contact: customerContact,
        notes: notes || null,
        invoice_date: invoiceDate,
        total_quantity: totals.q,
        total_subtotal: totals.sub,
        total_gst: totals.gst,
        grand_total: totals.grand,
      }).select().single();
      if (iErr) throw iErr;

      const lines = validRows.map((r) => {
        const c = calcRow(r);
        return {
          invoice_id: inv.id,
          item_id: r.item_id,
          item_name: r.item_name,
          serial_number: r.serial_number,
          quantity: r.quantity,
          unit_price: r.unit_price,
          gst_mode: r.gst_mode,
          gst_value: r.gst_value,
          subtotal: c.subtotal,
          gst_amount: c.gst,
          line_total: c.total,
        };
      });
      const { error: lErr } = await supabase.from("invoice_items").insert(lines);
      if (lErr) throw lErr;

      // Update stock
      for (const r of validRows) {
        const it = items.find((x) => x.id === r.item_id);
        if (!it) continue;
        await supabase.from("items").update({
          sold_quantity: it.sold_quantity + r.quantity,
        }).eq("id", it.id);
      }
      return { id: inv.id as string, invoice: inv, lines };
    },
    onSuccess: ({ id, invoice, lines }) => {
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      // Open printable PDF in a new tab
      try {
        openInvoicePdf(invoice as any, lines as any);
      } catch (e) {
        console.error("PDF open failed", e);
      }
      navigate({ to: "/invoices/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="text-sm text-muted-foreground">Sell items and generate an invoice.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer & Date</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Label>Customer Name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div><Label>Customer Contact</Label><Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} /></div>
          <div><Label>Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          <div className="md:col-span-4"><Label>Notes / Remarks</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, newRow()])}>
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Item</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead>GST Mode</TableHead>
                <TableHead className="text-right">GST Value</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const c = calcRow(r);
                const overstock = r.item_id && r.quantity > r.available;
                return (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Select value={r.item_id ?? ""} onValueChange={(v) => onPickItem(r.key, v)}>
                        <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                        <SelectContent>
                          {items.map((i) => {
                            const rem = i.quantity_available - i.sold_quantity;
                            return (
                              <SelectItem key={i.id} value={i.id} disabled={rem <= 0}>
                                {i.name} ({rem} left)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {overstock && <p className="text-xs text-destructive mt-1">Only {r.available} available</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.serial_number}</TableCell>
                    <TableCell><Input type="number" className="w-20 text-right" value={r.quantity}
                      onChange={(e) => updateRow(r.key, { quantity: parseInt(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-24 text-right" value={r.unit_price}
                      onChange={(e) => updateRow(r.key, { unit_price: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell>
                      <Select value={r.gst_mode} onValueChange={(v) => updateRow(r.key, { gst_mode: v as any })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percent %</SelectItem>
                          <SelectItem value="amount">Amount $</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" step="0.01" className="w-24 text-right" value={r.gst_value}
                      onChange={(e) => updateRow(r.key, { gst_value: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right">{fmtMoney(c.subtotal)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(c.gst)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(c.total)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="ml-auto max-w-sm space-y-2 text-sm">
            <Row label="Total Quantity" value={totals.q.toString()} />
            <Row label="Total Subtotal" value={fmtMoney(totals.sub)} />
            <Row label="Total GST" value={fmtMoney(totals.gst)} />
            <div className="border-t pt-2">
              <Row label="Grand Total" value={fmtMoney(totals.grand)} bold />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {save.isPending ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "text-lg font-bold" : "")}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}