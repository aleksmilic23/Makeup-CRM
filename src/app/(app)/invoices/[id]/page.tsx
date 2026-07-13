import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceActions } from "@/components/invoice-actions";
import { paymentInfo, hasPaymentInfo } from "@/lib/payment-info";
import { getBalanceDueDate } from "@/lib/invoice-utils";
import { Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { InvoiceWithRelations } from "@/lib/database.types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const typedInvoice = invoice as InvoiceWithRelations;
  const items = [...typedInvoice.invoice_items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{typedInvoice.invoice_number}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[typedInvoice.status]}`}>
              {typedInvoice.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${typedInvoice.clients.id}`} className="hover:underline">
              {typedInvoice.clients.name}
            </Link>
            {typedInvoice.event_date ? ` · Event ${format(parseISO(typedInvoice.event_date), "MMM d, yyyy")}` : ""}
            {" · "}Issued {format(parseISO(typedInvoice.issue_date), "MMM d, yyyy")}
            {typedInvoice.due_date ? ` · Due ${format(parseISO(typedInvoice.due_date), "MMM d, yyyy")}` : ""}
          </p>
        </div>
        <Link href={`/invoices/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        </Link>
      </div>

      <InvoiceActions invoice={typedInvoice} clientEmail={typedInvoice.clients.email} />

      {typedInvoice.status === "sent" && typedInvoice.sent_at && (
        <p className="text-xs text-muted-foreground">
          Emailed {format(new Date(typedInvoice.sent_at), "MMM d, yyyy · h:mm a")}
        </p>
      )}
      {typedInvoice.status === "paid" && typedInvoice.paid_at && (
        <p className="text-xs text-muted-foreground">
          Paid {format(new Date(typedInvoice.paid_at), "MMM d, yyyy · h:mm a")}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div>
                  <p>{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                <span className="font-medium">${Number(item.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-right text-sm">
            <p className="text-muted-foreground">Subtotal: ${Number(typedInvoice.subtotal).toFixed(2)}</p>
            {Number(typedInvoice.tax_rate) > 0 && (
              <p className="text-muted-foreground">
                Tax ({Number(typedInvoice.tax_rate)}%): ${Number(typedInvoice.tax_amount).toFixed(2)}
              </p>
            )}
            <p className="text-lg font-bold">Total: ${Number(typedInvoice.total).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {typedInvoice.deposit_amount != null && (
        <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-pink-800">
            {typedInvoice.deposit_paid_at ? "DEPOSIT" : "DEPOSIT DUE TO RESERVE YOUR DATE"}
          </p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-2xl font-bold">
              ${Number(typedInvoice.deposit_amount).toFixed(2)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({Number(typedInvoice.deposit_percentage)}% of total)
              </span>
            </p>
            {typedInvoice.deposit_paid_at ? (
              <span className="text-sm font-semibold text-green-700">
                Paid {format(new Date(typedInvoice.deposit_paid_at), "MMM d, yyyy")}
              </span>
            ) : typedInvoice.due_date ? (
              <span className="text-sm text-muted-foreground">
                Due {format(parseISO(typedInvoice.due_date), "MMM d, yyyy")}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-pink-200 pt-3 text-sm text-muted-foreground">
            <span>Remaining balance</span>
            <span>
              ${(Number(typedInvoice.total) - Number(typedInvoice.deposit_amount)).toFixed(2)}
              {(() => {
                const balanceDate = getBalanceDueDate(typedInvoice.event_date, typedInvoice.balance_due_offset_days);
                return balanceDate ? ` due by ${format(parseISO(balanceDate), "MMM d, yyyy")}` : "";
              })()}
            </span>
          </div>
        </div>
      )}

      {hasPaymentInfo() && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {paymentInfo.bankName && <p><span className="text-muted-foreground">Bank:</span> {paymentInfo.bankName}</p>}
            {paymentInfo.accountName && <p><span className="text-muted-foreground">Account Name:</span> {paymentInfo.accountName}</p>}
            {paymentInfo.accountNumber && <p><span className="text-muted-foreground">Account Number:</span> {paymentInfo.accountNumber}</p>}
            {paymentInfo.routingNumber && <p><span className="text-muted-foreground">Routing Number:</span> {paymentInfo.routingNumber}</p>}
            {paymentInfo.otherMethods && (
              <p className="whitespace-pre-line">{paymentInfo.otherMethods}</p>
            )}
          </CardContent>
        </Card>
      )}

      {typedInvoice.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{typedInvoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
