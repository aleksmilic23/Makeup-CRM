"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Download, CheckCircle, Ban, Wallet, MailCheck, Link2, Loader2 } from "lucide-react";
import { usePdfDownload } from "@/components/pdf-download-button";
import type { Invoice, Database } from "@/lib/database.types";

type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

interface Props {
  invoice: Invoice;
  clientEmail: string | null;
}

export function InvoiceActions({ invoice, clientEmail }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { downloading, download } = usePdfDownload(invoice.id, `${invoice.invoice_number}.pdf`);

  async function handleSend() {
    setSending(true);
    const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Failed to send invoice");
    } else {
      toast.success("Invoice emailed to client");
      router.refresh();
    }
    setSending(false);
  }

  async function updateStatus(status: "sent" | "void") {
    setUpdating(true);
    const patch: InvoiceUpdate = { status };
    if (status === "sent") patch.sent_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(patch).eq("id", invoice.id);
    if (error) {
      toast.error("Failed to update invoice");
    } else {
      toast.success(`Invoice marked ${status}`);
      router.refresh();
    }
    setUpdating(false);
  }

  async function copyClientLink() {
    const url = `${window.location.origin}/view/${invoice.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Client link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  async function markPaid(type: "deposit" | "full") {
    if (type === "full" && invoice.deposit_amount != null && !invoice.deposit_paid_at) {
      const confirmed = window.confirm(
        "This invoice has an unpaid deposit that was never marked as received. Marking it fully paid will skip deposit tracking — continue only if the client actually paid the full amount at once."
      );
      if (!confirmed) return;
    }
    setUpdating(true);
    const res = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(result.error ?? "Failed to update invoice");
    } else {
      toast.success(
        type === "deposit"
          ? result.emailed
            ? "Deposit marked paid — receipt emailed to you"
            : "Deposit marked as paid"
          : result.emailed
            ? "Invoice marked paid — receipt emailed to you"
            : "Invoice marked as paid"
      );
      router.refresh();
    }
    setUpdating(false);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={handleSend}
        disabled={sending || !clientEmail}
        title={!clientEmail ? "Client has no email on file" : undefined}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {sending ? "Sending..." : invoice.status === "sent" || invoice.status === "paid" ? "Resend Email" : "Send Email"}
      </Button>
      <Button size="sm" variant="outline" type="button" onClick={download} disabled={downloading}>
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5 mr-1.5" />
        )}
        {downloading ? "Preparing..." : "Download PDF"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={copyClientLink}
        title="Copies a read-only link safe to share with the client — no edit/payment controls"
      >
        <Link2 className="h-3.5 w-3.5 mr-1.5" />
        Copy Client Link
      </Button>
      {invoice.status === "draft" && (
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => updateStatus("sent")}
          disabled={updating}
          title="Use this if you sent the invoice yourself (e.g. downloaded and emailed it manually)"
        >
          <MailCheck className="h-3.5 w-3.5 mr-1.5" />
          Mark as Sent
        </Button>
      )}
      {invoice.deposit_amount != null && !invoice.deposit_paid_at && invoice.status !== "paid" && (
        <Button size="sm" variant="outline" type="button" onClick={() => markPaid("deposit")} disabled={updating}>
          <Wallet className="h-3.5 w-3.5 mr-1.5" />
          Mark Deposit Paid
        </Button>
      )}
      {invoice.status !== "paid" && (
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => markPaid("full")}
          disabled={updating}
          className={
            invoice.deposit_amount != null && !invoice.deposit_paid_at ? "ml-2 border-l-2 pl-[calc(0.75rem-2px)]" : undefined
          }
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Mark Paid
        </Button>
      )}
      {invoice.status !== "void" && (
        <Button size="sm" variant="ghost" type="button" onClick={() => updateStatus("void")} disabled={updating}>
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Void
        </Button>
      )}
    </div>
  );
}
