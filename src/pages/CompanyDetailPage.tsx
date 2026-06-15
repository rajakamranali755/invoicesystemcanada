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
import { Plus, Trash2, Save, ArrowLeft, Upload, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { formatHst, isValidHst, HST_PLACEHOLDER } from "@/lib/hst";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";
import { fmtMoney } from "@/lib/types";

const TEMPLATES = [
  { value: "classic", label: "Classic (Navy / Gold)" },
  { value: "modern", label: "Modern (Teal / Charcoal)" },
  { value: "vibrant", label: "Vibrant (Orange / Dark)" },
  { value: "elegant", label: "Elegant (Serif / Centered)" },
  { value: "bold", label: "Bold (Heavy Block)" },
  { value: "minimal", label: "Minimal (Hairline)" },
  { value: "corporate", label: "Corporate (Two-tone)" },
  { value: "monochrome", label: "Monochrome (Stark B&W)" },
  { value: "gradient", label: "Gradient (Primary→Accent fade)" },
  { value: "geometric", label: "Geometric (Circle + Block)" },
  { value: "executive", label: "Executive (Serif / Double Rule)" },
  { value: "industrial", label: "Industrial (Blueprint / Mono)" },
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
  const [newSvc, setNewSvc] = useState({ category: "", description: "", default_price: 0, notes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (form.tax_number && !isValidHst(form.tax_number)) {
        throw new Error("HST must be 9 digits (format: 12345 6789).");
      }
      const { error } = await supabase.from("companies").update({
        name: form.name, address: form.address, phone: form.phone, email: form.email,
        tax_number: form.tax_number, logo_url: form.logo_url,
        primary_color: form.primary_color, accent_color: form.accent_color,
        font_family: form.font_family, design_template: form.design_template, terms: form.terms,
        role: form.role,
        signature_url: form.signature_url ?? "",
        signature_position: form.signature_position ?? "right",
        website: form.website ?? "",
        social_links: form.social_links ?? "",
      }).eq("id", id);
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("Another company already uses this HST number.");
        }
        throw error;
      }
    },
    onSuccess: () => { toast.success("Company saved"); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["company", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addService = useMutation({
    mutationFn: async () => {
      if (!newSvc.description.trim()) throw new Error("Description required.");
      const { error } = await supabase.from("company_services").insert({ ...newSvc, price_label: "", company_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service added"); setNewSvc({ category: "", description: "", default_price: 0, notes: "" }); qc.invalidateQueries({ queryKey: ["company_services", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("company_services").delete().eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_services", id] }),
  });

  const bulkUpload = useMutation({
    mutationFn: async (rows: Array<Record<string, unknown>>) => {
      const normalized = rows.map((r) => {
        const get = (keys: string[]) => {
          for (const k of Object.keys(r)) {
            if (keys.some((kk) => k.trim().toLowerCase() === kk.toLowerCase())) return r[k];
          }
          return "";
        };
        return {
          company_id: id,
          category: String(get(["Category", "category"]) ?? "").trim(),
          description: String(get(["Description", "description"]) ?? "").trim(),
          price_label: "",
          default_price: parseFloat(String(get(["Price", "Default", "Default Price", "default_price"]) ?? "0")) || 0,
          notes: String(get(["Notes", "notes"]) ?? "").trim(),
        };
      }).filter((r) => r.description);
      if (normalized.length === 0) throw new Error("No valid rows found. Make sure 'Description' column has values.");
      const { error } = await supabase.from("company_services").insert(normalized);
      if (error) throw error;
      return normalized.length;
    },
    onSuccess: (n) => { toast.success(`Imported ${n} services`); qc.invalidateQueries({ queryKey: ["company_services", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      await bulkUpload.mutateAsync(rows);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const data = [
      { Category: "Consulting", Description: "Initial consultation (1 hour)", Price: 100, Notes: "Sample row — replace with your services" },
      { Category: "", Description: "", Price: 0, Notes: "" },
    ];
    const ws = XLSX.utils.json_to_sheet(data, { header: ["Category", "Description", "Price", "Notes"] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Services");
    XLSX.writeFile(wb, "services-template.xlsx");
  };

  if (!form) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Companies</Link></Button>

      <Card>
        <div className="h-3" style={{ background: `linear-gradient(90deg, ${form.primary_color}, ${form.accent_color})` }} />
        <CardHeader><CardTitle>Company Details & Branding</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              placeholder={PHONE_PLACEHOLDER}
              maxLength={12}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">10 digits, format 123-456-7890.</p>
          </div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div>
            <Label>HST</Label>
            <Input
              value={form.tax_number}
              placeholder={HST_PLACEHOLDER}
              maxLength={10}
              onChange={(e) => setForm({ ...form, tax_number: formatHst(e.target.value) })}
            />
            <p className="text-[10px] text-muted-foreground mt-1">9 digits, format 12345 6789. Must be unique.</p>
          </div>
          <div className="md:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" /></div>
          <div className="md:col-span-2"><Label>Social Media Links</Label><Textarea rows={2} value={form.social_links ?? ""} onChange={(e) => setForm({ ...form, social_links: e.target.value })} placeholder="Facebook: fb.com/...&#10;Instagram: @yourbrand" /></div>
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
          <div>
            <Label>Signature Position</Label>
            <Select value={form.signature_position ?? "right"} onValueChange={(v) => setForm({ ...form, signature_position: v as "left" | "right" | "none" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Bottom Left</SelectItem>
                <SelectItem value="right">Bottom Right</SelectItem>
                <SelectItem value="none">None (hide signature)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Signature Image</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => setForm({ ...form, signature_url: String(reader.result || "") });
                reader.readAsDataURL(f);
              }}
            />
            {form.signature_url && (
              <div className="mt-2 flex items-center gap-2">
                <img src={form.signature_url} alt="signature" className="h-12 object-contain bg-white border rounded" />
                <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, signature_url: "" })}>Remove</Button>
              </div>
            )}
          </div>
          <div className="md:col-span-3"><Label>Terms & Conditions</Label><Textarea rows={6} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
          <div className="md:col-span-3"><Button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}><Save className="h-4 w-4 mr-1" /> Save Changes</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services ({services.length})</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkUpload.isPending}>
              <Upload className="h-4 w-4 mr-1" /> {bulkUpload.isPending ? "Uploading..." : "Upload XLSX/CSV"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Bulk import: download the template, fill rows (columns: Category, Description, Price, Notes), then upload. Services will be added to <strong>{form.name}</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div><Label>Category</Label><Input value={newSvc.category} onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Input value={newSvc.description} onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })} /></div>
            <div><Label>Price $</Label><Input type="number" step="0.01" value={newSvc.default_price} onChange={(e) => setNewSvc({ ...newSvc, default_price: parseFloat(e.target.value) || 0 })} /></div>
            <Button onClick={() => addService.mutate()}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Price $</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No services yet. Use the form above to add the first service for this company.
                  </TableCell></TableRow>
                )}
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{s.category}</TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell className="text-right font-mono">{fmtMoney(s.default_price)}</TableCell>
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