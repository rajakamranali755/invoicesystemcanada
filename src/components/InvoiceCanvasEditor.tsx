import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_CUSTOM_LAYOUT, type CustomLayout, type Company, type ItemsTableStyle } from "@/lib/types";
import { buildCustomInvoicePdf } from "@/lib/customInvoicePdf";
import { InvoiceCanvasEditor } from "@/components/InvoiceCanvasEditor";

const TABLE_STYLES: { value: ItemsTableStyle; label: string; desc: string }[] = [
  { value: "compact", label: "Compact", desc: "Tight rows, small font" },
  { value: "zebra", label: "Zebra", desc: "Alternating tinted rows" },
  { value: "bordered", label: "Bordered", desc: "Full grid lines" },
  { value: "minimal", label: "Minimal", desc: "Hairline separators" },
  { value: "boxed", label: "Boxed", desc: "Bold framed cells" },
  { value: "spacious", label: "Spacious", desc: "Generous padding" },
  { value: "cards", label: "Cards", desc: "Colored rounded cards, no grid" },
  { value: "list", label: "List", desc: "Underlined rows, no grid" },
  { value: "receipt", label: "Receipt", desc: "Monospace, no grid" },
];

interface Props {
  company: Pick<Company, "name" | "address" | "phone" | "email" | "tax_number" | "primary_color" | "accent_color" | "website" | "social_links" | "logo_url" | "terms" | "signature_url" | "signature_position">;
  value: CustomLayout;
  onChange: (v: CustomLayout) => void;
}

export function CustomTemplateBuilder({ company, value, onChange }: Props) {
  const layout: CustomLayout = { ...DEFAULT_CUSTOM_LAYOUT, ...value };
  const set = <K extends keyof CustomLayout>(k: K, v: CustomLayout[K]) => onChange({ ...layout, [k]: v });

  const previewUrl = useMemo(() => {
    try {
      const fakeInvoice = {
        id: "p", invoice_number: "INV-PREVIEW", company_id: "p",
        customer_name: "Sample Customer Ltd.", customer_contact: "416-555-0100",
        customer_address: "123 Demo Street\nToronto, ON M5V 1A1",
        customer_email: "billing@sample.ca", customer_tax_number: "12345 6789 RT0001",
        notes: null, invoice_date: new Date().toISOString().slice(0, 10),
        total_quantity: 3, total_subtotal: 1500, total_gst: 195,
        grand_total: 1695, amount_paid: 0, created_at: "",
      };
      const items = [
        { id: "1", invoice_id: "p", item_id: null, item_name: "Sample Service A", serial_number: null, quantity: 1, unit_price: 800, gst_mode: "percent" as const, gst_value: 13, subtotal: 800, gst_amount: 104, line_total: 904, created_at: "" },
        { id: "2", invoice_id: "p", item_id: null, item_name: "Sample Service B", serial_number: null, quantity: 2, unit_price: 350, gst_mode: "percent" as const, gst_value: 13, subtotal: 700, gst_amount: 91, line_total: 791, created_at: "" },
      ];
      const fullCompany = {
        id: "p", ...company, font_family: "helvetica",
        design_template: "custom", role: "seller" as const, created_at: "",
      } as Company;
      const doc = buildCustomInvoicePdf(fakeInvoice, items, fullCompany, layout);
      return doc.output("datauristring");
    } catch (e) {
      console.error("preview failed", e);
      return null;
    }
  }, [layout, company]);

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Custom Template Builder</span>
          <span className="text-xs font-normal text-muted-foreground">Zone-based · live preview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Template Name</Label>
            <Input value={layout.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="My Custom Design" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Header Style</Label>
              <Select value={layout.headerStyle} onValueChange={(v) => set("headerStyle", v as CustomLayout["headerStyle"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Color Bar</SelectItem>
                  <SelectItem value="stripe">Thin Stripe</SelectItem>
                  <SelectItem value="none">Plain (no bar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Header Alignment</Label>
              <Select value={layout.headerAlign} onValueChange={(v) => set("headerAlign", v as CustomLayout["headerAlign"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Seller Contact</Label>
              <Select value={layout.sellerContact} onValueChange={(v) => set("sellerContact", v as CustomLayout["sellerContact"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="below-header">Below Header</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice Meta</Label>
              <Select value={layout.invoiceMeta} onValueChange={(v) => set("invoiceMeta", v as CustomLayout["invoiceMeta"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Number Left · Date Right</SelectItem>
                  <SelectItem value="both-left">Both Left</SelectItem>
                  <SelectItem value="both-right">Both Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bill To Position</Label>
              <Select value={layout.billTo} onValueChange={(v) => set("billTo", v as CustomLayout["billTo"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer Contact</Label>
              <Select value={layout.customerContact} onValueChange={(v) => set("customerContact", v as CustomLayout["customerContact"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opposite">Opposite Side of Bill To</SelectItem>
                  <SelectItem value="below-billto">Below Bill To</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Totals Position</Label>
              <Select value={layout.totals} onValueChange={(v) => set("totals", v as CustomLayout["totals"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Signature</Label>
              <Select value={layout.signature} onValueChange={(v) => set("signature", v as CustomLayout["signature"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Bottom Left</SelectItem>
                  <SelectItem value="right">Bottom Right</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Items Table Style</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TABLE_STYLES.map((s) => {
                const active = layout.itemsTable === s.value;
                return (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => set("itemsTable", s.value)}
                    className={`text-left border rounded-md p-2 transition-colors ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:bg-accent"}`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    <MiniTablePreview style={s.value} primary={company.primary_color} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Field Positions</Label>
          <InvoiceCanvasEditor
            positions={layout.positions}
            onChange={(p) => set("positions", p)}
            primary={company.primary_color}
            accent={company.accent_color}
          />
        </div>

        <div>
          <Label className="mb-2 block">Live Preview</Label>
          <div className="border rounded-md overflow-hidden bg-muted" style={{ height: 520 }}>
            {previewUrl ? (
              <iframe title="custom preview" src={previewUrl + "#toolbar=0&navpanes=0&view=FitH"} className="w-full h-full" />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Preview uses your primary/accent colors and sample data. This exact layout is what invoices will render.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniTablePreview({ style, primary }: { style: ItemsTableStyle; primary: string }) {
  const header = { background: primary, height: 6 };
  if (style === "compact") {
    return (
      <div className="mt-2 space-y-[1px]">
        <div style={header} />
        {[0, 1, 2].map((i) => <div key={i} className="h-1.5 bg-muted" />)}
      </div>
    );
  }
  if (style === "zebra") {
    return (
      <div className="mt-2 space-y-0">
        <div style={header} />
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-2" style={{ background: i % 2 ? primary + "22" : "transparent" }} />)}
      </div>
    );
  }
  if (style === "bordered") {
    return (
      <div className="mt-2 border">
        <div style={header} />
        {[0, 1, 2].map((i) => <div key={i} className="h-2 border-t" />)}
      </div>
    );
  }
  if (style === "minimal") {
    return (
      <div className="mt-2">
        <div className="h-1" style={{ background: primary }} />
        {[0, 1, 2].map((i) => <div key={i} className="h-2 border-b border-muted" />)}
      </div>
    );
  }
  if (style === "boxed") {
    return (
      <div className="mt-2 border-2" style={{ borderColor: primary }}>
        <div style={header} />
        {[0, 1].map((i) => <div key={i} className="h-3 border-t-2" style={{ borderColor: primary }} />)}
      </div>
    );
  }
if (style === "spacious") {
    return (
      <div className="mt-2 space-y-1">
        <div style={{ ...header, height: 8 }} />
        {[0, 1, 2].map((i) => <div key={i} className="h-3 bg-muted" />)}
      </div>
    );
  }
  if (style === "cards") {
    return (
      <div className="mt-2 space-y-1">
        {[0, 1].map((i) => <div key={i} className="h-4 rounded" style={{ background: primary + "cc" }} />)}
      </div>
    );
  }
  if (style === "list") {
    return (
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => <div key={i} className="h-1.5 border-b" style={{ borderColor: primary + "55" }} />)}
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1 font-mono">
      {[0, 1, 2].map((i) => <div key={i} className="h-1.5 bg-muted" style={{ opacity: 0.7 }} />)}
    </div>
  );
}
