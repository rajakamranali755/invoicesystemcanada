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
import { useNavigate } from "react-router-dom";
import { openInvoicePdf } from "@/lib/invoicePdf";
import { formatHst, HST_PLACEHOLDER } from "@/lib/hst";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

interface Row {
  key: string;
  service_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
}

const newRow = (): Row => ({
  key: Math.random().toString(36).slice(2),
  service_id: null, item_name: "",
  quantity: 1, unit_price: 0,
});

const GST_RATE = 0.13;
function calcRow(r: Row) {
  const subtotal = r.quantity * r.unit_price;
  return { subtotal };
}

export function SalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [companyId, setCompanyId] = useState<string>("");
  const [customerCompanyId, setCustomerCompanyId] = useState<string>("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [numberLoading, setNumberLoading] = useState(false);
  const [editableInvoiceNo, setEditableInvoiceNo] = useState(false);

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
    setCustomerAddress(c.address);
    setCustomerEmail(c.email);
    setCustomerContact(formatPhone(c.phone));
    setCustomerTaxNumber(formatHst(c.tax_number));
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
      quantity: 1,
    });
  };

  const totals = useMemo(() => {
    let q = 0, sub = 0;
    for (const r of rows) {
      const c = calcRow(r);
      q += r.quantity; sub += c.subtotal;
    }
    const gst = sub * GST_RATE;
    return { q, sub, gst, grand: sub + gst };
  }, [rows]);

  // Live preview disabled per request — final PDF opens on Save.

  const save = useMutation({
    mutationFn: async () => {
     if (!companyId) throw new Error("Select a company.");
    const validRows = rows.filter((r) => r.item_name && r.quantity > 0);
    if (validRows.length === 0) throw new Error("Add at least one item.");

    let finalInvoiceNumber: string;
    if (editableInvoiceNo) {
    if (!invoiceNumber.trim()) throw new Error("Invoice number is required.");
    finalInvoiceNumber = invoiceNumber.trim();
    } else {
    const { data: lastInv } = await supabase
  .from("invoices")
  .select("invoice_number")
  .order("created_at", { ascending: false })
  .limit(1)
  .single();

const last = lastInv?.invoice_number ?? "0";
finalInvoiceNumber = String(Number(last) + 1);
    }

      const { data: inv, error: iErr } = await supabase.from("invoices").insert({
        invoice_number: finalInvoiceNumber,

        company_id: companyId,
        customer_name: companies.find((c) => c.id === customerCompanyId)?.name || "",
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
        amount_paid: 0,
      }).select().single();
      if (iErr) throw iErr;

      const lines = validRows.map((r) => {
        const c = calcRow(r);
        const gst = c.subtotal * GST_RATE;
        return {
          invoice_id: inv.id,
          company_service_id: r.service_id,
          item_name: r.item_name,
          serial_number: null,
          quantity: r.quantity,
          unit_price: r.unit_price,
          gst_mode: "percent",
          gst_value: 13,
          subtotal: c.subtotal,
          gst_amount: gst,
          line_total: c.subtotal + gst,
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="text-sm text-muted-foreground">Pick seller (From), purchaser (To), then add services.</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
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
          <div className="md:col-span-2"><Label>Date</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          <div className="md:col-span-2">
            <Label>Customer Company — TO (Purchaser)</Label>
            <Select value={customerCompanyId} onValueChange={onPickPurchaser}>
              <SelectTrigger><SelectValue placeholder="Select purchaser company (auto-fills details)" /></SelectTrigger>
              <SelectContent>
                {purchaserCompanies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Contact Person</Label>
            <Input
              value={customerContact}
              placeholder={PHONE_PLACEHOLDER}
              maxLength={12}
              onChange={(e) => setCustomerContact(formatPhone(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground mt-1">10 digits, format 123-456-7890.</p>
          </div>
          <div className="md:col-span-2"><Label>Customer Email</Label><Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer Address</Label><Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></div>
          <div className="md:col-span-2">
            <Label>Customer HST / Tax #</Label>
            <Input
              value={customerTaxNumber}
              placeholder={HST_PLACEHOLDER}
              maxLength={10}
              onChange={(e) => setCustomerTaxNumber(formatHst(e.target.value))}
            />
            <p className="text-[10px] text-muted-foreground mt-1">9 digits, format 12345 6789.</p>
          </div>
        <div className="md:col-span-4"><Label>Notes / Remarks</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="md:col-span-2">
  <div className="flex items-center gap-2 mb-1">
    <input
      type="checkbox"
      id="editableInvoiceNo"
      checked={editableInvoiceNo}
      onChange={(e) => setEditableInvoiceNo(e.target.checked)}
    />
    <Label htmlFor="editableInvoiceNo" className="cursor-pointer">Need editable invoice #</Label>
  </div>
  {editableInvoiceNo && (
    <>
      <Input
        value={invoiceNumber}
        placeholder={numberLoading ? "Generating..." : "Invoice number"}
        onChange={(e) => setInvoiceNumber(e.target.value)}
      />
      <p className="text-[10px] text-muted-foreground mt-1">Auto-generated — you can edit it before saving.</p>
    </>
  )}
</div>
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
                <TableHead className="text-center w-24">Qty</TableHead>
                <TableHead className="text-center w-32">Unit Price</TableHead>
                <TableHead className="text-right w-28">Subtotal</TableHead>
                <TableHead className="w-12"></TableHead>
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
                              {s.category ? `[${s.category}] ` : ""}{s.description} — {fmtMoney(s.default_price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {r.item_name && !r.service_id && <p className="text-xs text-muted-foreground mt-1">{r.item_name}</p>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input type="number" className="w-full text-center" value={r.quantity}
                        onChange={(e) => updateRow(r.key, { quantity: parseInt(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input type="number" step="0.01" className="w-full text-center" value={r.unit_price}
                        onChange={(e) => updateRow(r.key, { unit_price: parseFloat(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(c.subtotal)}</TableCell>
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
            <Row label="HST (13%)" value={fmtMoney(totals.gst)} />
            <div className="border-t pt-2">
              <Row label="Grand Total" value={fmtMoney(totals.grand)} bold />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
                        <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending || numberLoading}>

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
