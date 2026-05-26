import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function InvoicesListPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

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
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/invoices/$id" params={{ id: i.id }}>
                          <Eye className="h-4 w-4 mr-1" /> View
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