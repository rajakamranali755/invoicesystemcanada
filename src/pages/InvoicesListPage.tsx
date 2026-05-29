import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice, InvoiceItem, Company } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Eye, FileText } from "lucide-react";
import { openInvoicePdf } from "@/lib/invoicePdf";
import { toast } from "sonner";

export function InvoicesListPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

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
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
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
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No invoices yet.</TableCell></TableRow>
                )}
                {invoices.map((i) => (
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