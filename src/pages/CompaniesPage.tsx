import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

const TEMPLATES = [
  { value: "classic", label: "Classic (Navy / Gold)" },
  { value: "modern", label: "Modern (Teal / Charcoal)" },
  { value: "vibrant", label: "Vibrant (Orange / Dark)" },
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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

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
      const { error } = await supabase.from("companies").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Company added");
      setForm(empty); setOpen(false);
      qc.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

      {open && (
        <Card>
          <CardHeader><CardTitle>New Company</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          {companies.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="h-3" style={{ background: `linear-gradient(90deg, ${c.primary_color}, ${c.accent_color})` }} />
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{c.name}</span>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: c.primary_color + "22", color: c.primary_color }}>{c.role}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground whitespace-pre-line">{c.address || "No address"}</p>
                <p>{c.phone} · {c.email}</p>
                <p className="text-xs text-muted-foreground">HST: {c.tax_number || "—"}</p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to="/companies/$id" params={{ id: c.id }}>
                    <Settings className="h-4 w-4 mr-1" /> Manage services & branding
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}