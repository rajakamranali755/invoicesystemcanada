import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Route } from "@/routes/_app.companies.$id";
import type { Company, CompanyService } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

const TEMPLATES = [
  { value: "classic", label: "Classic (Navy / Gold)" },
  { value: "modern", label: "Modern (Teal / Charcoal)" },
  { value: "vibrant", label: "Vibrant (Orange / Dark)" },
];

const ROLES = [
  { value: "seller", label: "Seller" },
  { value: "purchaser", label: "Purchaser" },
  { value: "both", label: "Both" },
];

export function CompanyDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState<Company | null>(null);
  const [newSvc, setNewSvc] = useState({ category: "", description: "", price_label: "", default_price: 0, notes: "" });

  const { data: company } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Company;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["company_services", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_services").select("*").eq("company_id", id).order("category");
      if (error) throw error;
      return data as CompanyService[];
    },
  });

  useEffect(() => { if (company) setForm(company); }, [company]);

  const saveCompany = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const { error } = await supabase.from("companies").update({
        name: form.name, address: form.address, phone: form.phone, email: form.email,
        tax_number: form.tax_number, logo_url: form.logo_url,
        primary_color: form.primary_color, accent_color: form.accent_color,
        font_family: form.font_family, design_template: form.design_template, terms: form.terms,
        role: form.role,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Company saved"); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["company", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addService = useMutation({
    mutationFn: async () => {
      if (!newSvc.description.trim()) throw new Error("Description required.");
      const { error } = await supabase.from("company_services").insert({ ...newSvc, company_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service added"); setNewSvc({ category: "", description: "", price_label: "", default_price: 0, notes: "" }); qc.invalidateQueries({ queryKey: ["company_services", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("company_services").delete().eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_services", id] }),
  });

  if (!form) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Companies</Link></Button>

      <Card>
        <div className="h-3" style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
        <CardHeader><CardTitle>Company Details & Branding</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Tax / HST</Label><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Company["role"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Design Template</Label>
            <Select value={form.design_template} onValueChange={(v) => setForm({ ...form, design_template: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEMPLATES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Primary Color</Label><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
          <div><Label>Accent Color</Label><Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Terms & Conditions</Label><Textarea rows={6} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
          <div className="md:col-span-3"><Button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}><Save className="h-4 w-4 mr-1" /> Save Changes</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Services ({services.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div><Label>Category</Label><Input value={newSvc.category} onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={newSvc.description} onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })} /></div>
            <div><Label>Price Label</Label><Input value={newSvc.price_label} onChange={(e) => setNewSvc({ ...newSvc, price_label: e.target.value })} placeholder="$100 – $250" /></div>
            <div><Label>Default $</Label><Input type="number" value={newSvc.default_price} onChange={(e) => setNewSvc({ ...newSvc, default_price: parseFloat(e.target.value) || 0 })} /></div>
            <Button onClick={() => addService.mutate()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Default $</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{s.category}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell className="font-mono text-xs">{s.price_label}</TableCell>
                    <TableCell className="text-right">${Number(s.default_price).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.notes}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => deleteService.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}