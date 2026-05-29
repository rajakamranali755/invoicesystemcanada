import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company, CompanyService } from "@/lib/types";
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
import { openInvoicePdf, buildInvoicePdf } from "@/lib/invoicePdf";

interface Row {
  key: string;
  service_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  gst_mode: "percent" | "amount";
  gst_value: number;
}

const newRow = (): Row => ({
  key: Math.random().toString(36).slice(2),
  service_id: null, item_name: "",
  quantity: 1, unit_price: 0, gst_mode: "percent", gst_value: 13,
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
  const [companyId, setCompanyId] = useState<string>("");
  const [customerCompanyId, setCustomerCompanyId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["company_services", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("company_services").select("*").eq("company_id", companyId).order("category");
      if (error) throw error;
      return data as CompanyService[];
    },
  });

  const selectedCompany = companies.find((c) => c.id === companyId);
  const sellerCompanies = companies.filter((c) => c.role === "seller" || c.role === "both");
  const purchaserCompanies = companies.filter((c) => c.role === "purchaser" || c.role === "both");

  const onPickPurchaser = (cid: string) => {
    setCustomerCompanyId(cid);
    const c = companies.find((x) => x.id === cid);
    if (!c) return;
    setCustomerName(c.name);
    setCustomerAddress(c.address);
    setCustomerEmail(c.email);
    setCustomerContact(c.phone);
    setCustomerTaxNumber(c.tax_number);
  };

  useEffect(() => { setRows([newRow()]); }, [companyId]);

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const onPickService = (key: string, sid: string) => {
    const s = services.find((x) => x.id === sid);
    if (!s) return;
    updateRow(key, {
      service_id: s.id,
      item_name: s.description,
      unit_price: Number(s.default_price),
      gst_mode: "percent",
      gst_value: 13,
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

  // Live preview PDF
  const previewUrl = useMemo(() => {
    if (!selectedCompany) return null;
    try {
      const fakeInvoice = {
        id: "preview", invoice_number: "PREVIEW", company_id: companyId,
        customer_name: customerName, customer_contact: customerContact,
        customer_address: customerAddress, customer_email: customerEmail,
        customer_tax_number: customerTaxNumber,
        notes, invoice_date: invoiceDate,
        total_quantity: totals.q, total_subtotal: totals.sub,
        total_gst: totals.gst, grand_total: totals.grand,
        amount_paid: amountPaid, created_at: "",
      };
      const lines = rows.filter((r) => r.item_name).map((r) => {
        const c = calcRow(r);
        return {
          id: r.key, invoice_id: "preview", item_id: null,
          item_name: r.item_name, serial_number: null,
          quantity: r.quantity, unit_price: r.unit_price,
          gst_mode: r.gst_mode, gst_value: r.gst_value,
          subtotal: c.subtotal, gst_amount: c.gst, line_total: c.total,
          created_at: "",
        };
      });
      const doc = buildInvoicePdf(fakeInvoice as never, lines as never, selectedCompany);
      return doc.output("datauristring");
    } catch (e) {
      console.error("preview failed", e);
      return null;
    }
  }, [selectedCompany, companyId, customerName, customerContact, customerAddress, customerEmail, customerTaxNumber, notes, invoiceDate, totals, amountPaid, rows]);

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Select a company.");
      const validRows = rows.filter((r) => r.item_name && r.quantity > 0);
      if (validRows.length === 0) throw new Error("Add at least one item.");
      const { data: numRow, error: nErr } = await supabase.rpc("generate_invoice_number");
      if (nErr) throw nErr;
      const invoice_number = numRow as unknown as string;

      const { data: inv, error: iErr } = await supabase.from("invoices").insert({
        invoice_number,
        company_id: companyId,
        customer_name: customerName,
        customer_contact: customerContact,
        customer_address: customerAddress,
        customer_email: customerEmail,
        customer_tax_number: customerTaxNumber,
        notes: notes || null,
        invoice_date: invoiceDate,
        total_quantity: totals.q,
        total_subtotal: totals.sub,
        total_gst: totals.gst,
        grand_total: totals.grand,
        amount_paid: amountPaid,
      }).select().single();
      if (iErr) throw iErr;

      const lines = validRows.map((r) => {
        const c = calcRow(r);
        return {
          invoice_id: inv.id,
          company_service_id: r.service_id,
          item_name: r.item_name,
          serial_number: null,
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

      return { id: inv.id as string, invoice: inv, lines };
    },
    onSuccess: ({ id, invoice, lines }) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
      try {
        openInvoicePdf(invoice as never, lines as never, selectedCompany ?? null);
      } catch (e) {
        console.error("PDF open failed", e);
      }
      navigate({ to: "/invoices/$id", params: { id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-6">
      <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="text-sm text-muted-foreground">Pick seller (From), purchaser (To), then add services.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Issuing Company & Customer</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Issuing Company — FROM (Seller)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select seller company" /></SelectTrigger>
              <SelectContent>
                {sellerCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedCompany && (
              <p className="text-xs text-muted-foreground mt-1">
                Template: <span className="font-mono">{selectedCompany.design_template}</span> · {services.length} services
              </p>
            )}
          </div>
          <div><Label>Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          <div><Label>Amount Paid</Label><Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} /></div>
          <div className="md:col-span-2">
            <Label>Customer Company — TO (Purchaser)</Label>
            <Select value={customerCompanyId} onValueChange={onPickPurchaser}>
              <SelectTrigger><SelectValue placeholder="Select purchaser company (auto-fills details)" /></SelectTrigger>
              <SelectContent>
                {purchaserCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Contact Person</Label><Input value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer Name (Bill To)</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer Email</Label><Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer Address</Label><Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer HST / Tax #</Label><Input value={customerTaxNumber} onChange={(e) => setCustomerTaxNumber(e.target.value)} /></div>
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
                <TableHead className="min-w-[260px]">Service</TableHead>
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
                return (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Select value={r.service_id ?? ""} onValueChange={(v) => onPickService(r.key, v)} disabled={!companyId}>
                        <SelectTrigger><SelectValue placeholder={companyId ? "Select service" : "Pick a company first"} /></SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.category ? `[${s.category}] ` : ""}{s.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {r.item_name && !r.service_id && <p className="text-xs text-muted-foreground mt-1">{r.item_name}</p>}
                    </TableCell>
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

      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-2">
          <h3 className="text-sm font-semibold">Live Preview</h3>
          <p className="text-xs text-muted-foreground">Updates as you type. Final PDF opens on Save.</p>
          <div className="border rounded-md overflow-hidden bg-muted" style={{ height: "calc(100vh - 180px)" }}>
            {previewUrl ? (
              <iframe title="Invoice preview" src={previewUrl} className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                Select an issuing company to preview the invoice.
              </div>
            )}
          </div>
        </div>
      </aside>
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