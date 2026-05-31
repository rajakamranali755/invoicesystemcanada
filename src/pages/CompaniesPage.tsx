import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, Trash2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { buildInvoicePdf } from "@/lib/invoicePdf";

const TEMPLATES = [
  { value: "classic", label: "Classic (Navy / Gold)" },
  { value: "modern", label: "Modern (Teal / Charcoal)" },
  { value: "vibrant", label: "Vibrant (Orange / Dark)" },
  { value: "elegant", label: "Elegant (Serif / Centered)" },
  { value: "bold", label: "Bold (Heavy Block)" },
  { value: "minimal", label: "Minimal (Hairline)" },
  { value: "corporate", label: "Corporate (Two-tone)" },
];

const empty = {
  name: "", address: "", phone: "", email: "", tax_number: "", logo_url: "",
  primary_color: "#0f1b3d", accent_color: "#c9a84c", font_family: "helvetica",
  design_template: "classic", terms: "", role: "seller" as "seller" | "purchaser" | "both",
};

const ROLES = [
  { value: "seller", label: "Seller (issues invoices)" },
  { value: "purchaser", label: "Purchaser (customer)" },
  { value: "both", label: "Both" },
];

export function CompaniesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [roleFilter, setRoleFilter] = useState<"all" | "seller" | "purchaser" | "both">("all");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Company name required.");
      const { data, error } = await supabase.from("companies").insert(form).select().single();
      if (error) throw error;
      return data as Company;
    },
    onSuccess: (c) => {
      toast.success("Company added — now add its services");
      setForm(empty); setOpen(false);
      qc.invalidateQueries({ queryKey: ["companies"] });
      navigate({ to: "/companies/$id", params: { id: c.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company deleted");
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => roleFilter === "all" ? companies : companies.filter((c) => c.role === roleFilter),
    [companies, roleFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
          <p className="text-sm text-muted-foreground">Each company has its own services, branding and invoice design.</p>
        </div>
        <Button onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4 mr-1" /> {open ? "Close" : "Add Company"}
        </Button>
      </div>

      <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({companies.length})</TabsTrigger>
          <TabsTrigger value="seller">Sellers ({companies.filter((c) => c.role === "seller").length})</TabsTrigger>
          <TabsTrigger value="purchaser">Purchasers ({companies.filter((c) => c.role === "purchaser").length})</TabsTrigger>
          <TabsTrigger value="both">Both ({companies.filter((c) => c.role === "both").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {open && (
        <Card>
          <CardHeader><CardTitle>New Company</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <p className="md:col-span-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Tip: After saving, you'll be taken to this company's page where you can add its services & pricing.
            </p>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Tax / HST Number</Label><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as typeof form.role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Design Template</Label>
              <Select value={form.design_template} onValueChange={(v) => setForm({ ...form, design_template: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Primary Color</Label><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
            <div><Label>Accent Color</Label><Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Terms & Conditions</Label><Textarea rows={4} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
            <div className="md:col-span-3"><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Saving..." : "Save Company"}</Button></div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => <CompanyCard key={c.id} c={c} onDelete={(id) => {
            if (confirm(`Delete "${c.name}"? This also removes its services and breaks any invoices linked to it.`)) remove.mutate(id);
          }} />)}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No companies in this filter.</p>}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ c, onDelete }: { c: Company; onDelete: (id: string) => void }) {
  const previewUrl = useMemo(() => {
    try {
      const fakeInvoice = {
        id: "p", invoice_number: "INV-PREVIEW", company_id: c.id,
        customer_name: "Sample Customer Ltd.", customer_contact: "Jane Doe",
        customer_address: "123 Demo Street\nToronto, ON M5V 1A1",
        customer_email: "billing@sample.ca", customer_tax_number: "12345 6789 RT0001",
        notes: null, invoice_date: new Date().toISOString().slice(0, 10),
        total_quantity: 3, total_subtotal: 1500, total_gst: 195,
        grand_total: 1695, amount_paid: 0, created_at: "",
      };
      const lines = [
        { id: "1", invoice_id: "p", item_id: null, item_name: "Sample Service A", serial_number: null, quantity: 1, unit_price: 800, gst_mode: "percent" as const, gst_value: 13, subtotal: 800, gst_amount: 104, line_total: 904, created_at: "" },
        { id: "2", invoice_id: "p", item_id: null, item_name: "Sample Service B", serial_number: null, quantity: 2, unit_price: 350, gst_mode: "percent" as const, gst_value: 13, subtotal: 700, gst_amount: 91, line_total: 791, created_at: "" },
      ];
      const doc = buildInvoicePdf(fakeInvoice, lines, c);
      return doc.output("datauristring");
    } catch (e) {
      console.error("card preview failed", e);
      return null;
    }
  }, [c]);

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="h-3 shrink-0" style={{ background: `linear-gradient(90deg, ${c.primary_color}, ${c.accent_color})` }} />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="truncate">{c.name}</span>
          <span className="text-[10px] font-mono px-2 py-1 rounded uppercase shrink-0" style={{ background: c.primary_color + "22", color: c.primary_color }}>{c.role}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-1 flex flex-col">
        <div className="border rounded-md overflow-hidden bg-muted" style={{ height: 220 }}>
          {previewUrl ? (
            <iframe title={`${c.name} invoice preview`} src={previewUrl + "#toolbar=0&navpanes=0&view=FitH"} className="w-full h-full pointer-events-none" />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Template: <span className="font-mono">{c.design_template}</span> · HST {c.tax_number || "—"}
        </p>
        <div className="mt-auto flex gap-2">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/companies/$id" params={{ id: c.id }}>
              <Settings className="h-4 w-4 mr-1" /> Manage
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(c.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}