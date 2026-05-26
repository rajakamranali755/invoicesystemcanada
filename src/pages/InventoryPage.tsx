import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "@/lib/types";
import { fmtMoney } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, Package, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  id?: string;
  serial_number: string;
  name: string;
  description: string;
  price: string;
  gst_percent: string;
  quantity_available: string;
};

const empty: FormState = {
  serial_number: "", name: "", description: "",
  price: "0", gst_percent: "0", quantity_available: "0",
};

export function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  const saveItem = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        serial_number: f.serial_number.trim(),
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: parseFloat(f.price) || 0,
        gst_percent: parseFloat(f.gst_percent) || 0,
        quantity_available: parseInt(f.quantity_available) || 0,
      };
      if (f.id) {
        const { error } = await supabase.from("items").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      setOpenForm(false);
      setForm(empty);
      toast.success("Item saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.serial_number.toLowerCase().includes(q),
    );
  }, [items, search]);

  const stats = useMemo(() => {
    let stock = 0, sold = 0, unsold = 0;
    for (const i of items) {
      const remaining = i.quantity_available - i.sold_quantity;
      stock += i.quantity_available;
      sold += i.sold_quantity;
      unsold += Math.max(remaining, 0);
    }
    return { stock, sold, unsold };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground">Manage products, stock and pricing.</p>
        </div>
        <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Item" : "Add Item"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Item Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              </div>
              <div>
                <Label>Quantity Available</Label>
                <Input type="number" value={form.quantity_available}
                  onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" step="0.01" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>GST %</Label>
                <Input type="number" step="0.01" value={form.gst_percent}
                  onChange={(e) => setForm({ ...form, gst_percent: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description (optional)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
              <Button onClick={() => saveItem.mutate(form)} disabled={!form.name || !form.serial_number || saveItem.isPending}>
                {saveItem.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Stock" value={stats.stock} icon={Package} />
        <StatCard label="Total Sold" value={stats.sold} icon={TrendingUp} />
        <StatCard label="Unsold (Remaining)" value={stats.unsold} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Items</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name or serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">GST %</TableHead>
                    <TableHead className="text-right">GST Amt</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No items.</TableCell></TableRow>
                  )}
                  {filtered.map((i) => {
                    const remaining = i.quantity_available - i.sold_quantity;
                    const gstAmt = (i.price * i.gst_percent) / 100;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.serial_number}</TableCell>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-right">{fmtMoney(i.price)}</TableCell>
                        <TableCell className="text-right">{i.gst_percent}%</TableCell>
                        <TableCell className="text-right">{fmtMoney(gstAmt)}</TableCell>
                        <TableCell className="text-right">{i.quantity_available}</TableCell>
                        <TableCell className="text-right">{i.sold_quantity}</TableCell>
                        <TableCell className={"text-right font-semibold " + (remaining <= 0 ? "text-destructive" : "")}>{remaining}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => {
                              setForm({
                                id: i.id, serial_number: i.serial_number, name: i.name,
                                description: i.description ?? "", price: String(i.price),
                                gst_percent: String(i.gst_percent),
                                quantity_available: String(i.quantity_available),
                              });
                              setOpenForm(true);
                            }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              if (confirm(`Delete ${i.name}?`)) deleteItem.mutate(i.id);
                            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}