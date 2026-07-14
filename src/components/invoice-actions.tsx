"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Download, CheckCircle, Ban, Wallet, MailCheck } from "lucide-react";
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

  async function updateStatus(status: "sent" | "paid" | "void") {
    setUpdating(true);
    const patch: InvoiceUpdate = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
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

  async function markDepositPaid() {
    setUpdating(true);
    const { error } = await supabase
      .from("invoices")
      .update({ deposit_paid_at: new Date().toISOString() })
      .eq("id", invoice.id);
    if (error) {
      toast.error("Failed to update invoice");
    } else {
      toast.success("Deposit marked as paid");
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
      <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="outline" type="button">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download PDF
        </Button>
      </a>
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
        <Button size="sm" variant="outline" type="button" onClick={markDepositPaid} disabled={updating}>
          <Wallet className="h-3.5 w-3.5 mr-1.5" />
          Mark Deposit Paid
        </Button>
      )}
      {invoice.status !== "paid" && (
        <Button size="sm" variant="outline" type="button" onClick={() => updateStatus("paid")} disabled={updating}>
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
