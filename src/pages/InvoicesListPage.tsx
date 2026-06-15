import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice, InvoiceItem, Company } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, FileText } from "lucide-react";
import { openInvoicePdf } from "@/lib/invoicePdf";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function InvoicesListPage() {
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data as Company[];
    },
  });

  const years = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => set.add((i.invoice_date || "").slice(0, 4)));
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [invoices]);

  const filtered = useMemo(() => invoices.filter((i) => {
    if (companyFilter !== "all" && i.company_id !== companyFilter) return false;
    if (yearFilter !== "all" && !(i.invoice_date || "").startsWith(yearFilter)) return false;
    return true;
  }), [invoices, companyFilter, yearFilter]);

  const viewPdf = async (invId: string, companyId: string | null) => {
    try {
      const [{ data: inv }, { data: items }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invId).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invId),
      ]);
      let company: Company | null = null;
      if (companyId) {
        const { data: c } = await supabase.from("companies").select("*").eq("id", companyId).single();
        company = (c as Company) ?? null;
      }
      openInvoicePdf(inv as Invoice, (items ?? []) as InvoiceItem[], company);
    } catch (e) {
      toast.error("Could not open PDF");
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
        <p className="text-sm text-muted-foreground">All generated invoices.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>History</CardTitle>
          <div className="flex gap-2">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
                )}
                {filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono">{i.invoice_number}</TableCell>
                    <TableCell>{i.invoice_date}</TableCell>
                    <TableCell>{i.customer_name || "—"}</TableCell>
                    <TableCell className="text-right">{i.total_quantity}</TableCell>
                    <TableCell className="text-right">{fmtMoney(i.total_subtotal)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(i.total_gst)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(i.grand_total)}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" onClick={() => viewPdf(i.id, i.company_id)}>
                        <FileText className="h-4 w-4 mr-1" /> PDF
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/invoices/$id" params={{ id: i.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}