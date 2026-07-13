import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { InvoiceWithRelations } from "@/lib/database.types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

async function getInvoices(): Promise<InvoiceWithRelations[]> {
  const { data } = await supabase
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .order("created_at", { ascending: false });
  return (data ?? []) as InvoiceWithRelations[];
}

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Invoice
          </Button>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first invoice to bill a client.</p>
            <Link href="/invoices/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {invoice.invoice_number} · {invoice.clients?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                      {invoice.due_date ? ` · Due ${format(new Date(invoice.due_date), "MMM d, yyyy")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">${Number(invoice.total).toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
