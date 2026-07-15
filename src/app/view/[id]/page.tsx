import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { Download, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { business } from "@/lib/business";
import { paymentInfo, hasPaymentInfo } from "@/lib/payment-info";
import { getBalanceDueDate } from "@/lib/invoice-utils";
import type { InvoiceWithRelations } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

export default async function ClientInvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-pink-50/50 px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-500" />
          <span className="font-semibold text-sm tracking-tight">{business.name}</span>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{typedInvoice.invoice_number}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[typedInvoice.status]}`}>
                  {typedInvoice.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {typedInvoice.clients.name}
                {typedInvoice.event_date
                  ? ` · Event ${format(parseISO(typedInvoice.event_date), "MMM d, yyyy")}`
                  : ""}
                {" · "}Issued {format(parseISO(typedInvoice.issue_date), "MMM d, yyyy")}
              </p>
            </div>
            <a
              href={`/api/invoices/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </a>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Line Items</p>
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
          </div>

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
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Payment Details</p>
              <div className="space-y-1 text-sm">
                {paymentInfo.bankName && <p><span className="text-muted-foreground">Bank:</span> {paymentInfo.bankName}</p>}
                {paymentInfo.accountName && <p><span className="text-muted-foreground">Account Name:</span> {paymentInfo.accountName}</p>}
                {paymentInfo.accountNumber && <p><span className="text-muted-foreground">Account Number:</span> {paymentInfo.accountNumber}</p>}
                {paymentInfo.routingNumber && <p><span className="text-muted-foreground">Routing Number:</span> {paymentInfo.routingNumber}</p>}
                {paymentInfo.otherMethods && <p className="whitespace-pre-line">{paymentInfo.otherMethods}</p>}
              </div>
            </div>
          )}

          {typedInvoice.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{typedInvoice.notes}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Questions about this invoice? Reply to the email it came from, or reach out to {business.name} directly.
        </p>
      </div>
    </div>
  );
}
