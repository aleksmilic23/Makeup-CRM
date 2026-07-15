import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { business, APP_URL } from "@/lib/business";
import { getTotalPaid, getBalanceDueDate, formatLongDate } from "@/lib/invoice-utils";
import type { InvoiceWithRelations } from "@/lib/database.types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const type: "deposit" | "full" = body.type === "deposit" ? "deposit" : "full";

  const patch =
    type === "deposit"
      ? { deposit_paid_at: new Date().toISOString() }
      : { status: "paid" as const, paid_at: new Date().toISOString() };

  const { data: invoice, error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select("*, clients(*), invoice_items(*)")
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message ?? "Invoice not found" }, { status: 500 });
  }

  const typedInvoice = invoice as InvoiceWithRelations;

  const apiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!apiKey || !ownerEmail) {
    return NextResponse.json({ updated: true, emailed: false, reason: "Email not configured" });
  }

  const hasDeposit = typedInvoice.deposit_amount != null;
  const depositAlreadyPaid = hasDeposit && !!typedInvoice.deposit_paid_at;
  const amountJustPaid =
    type === "deposit"
      ? Number(typedInvoice.deposit_amount)
      : depositAlreadyPaid
        ? Number(typedInvoice.total) - Number(typedInvoice.deposit_amount)
        : Number(typedInvoice.total);
  const remainingBalance = Number(typedInvoice.total) - getTotalPaid(typedInvoice);
  const balanceDate = getBalanceDueDate(typedInvoice.event_date, typedInvoice.balance_due_offset_days);
  const clientViewLink = `${APP_URL}/view/${id}`;
  const clientName = typedInvoice.clients?.name ?? "Unknown client";

  const clientMessage =
    remainingBalance > 0
      ? `Hi ${clientName},<br/><br/>Thank you! We've received your $${amountJustPaid.toFixed(2)} ${type === "deposit" ? "deposit" : "payment"} for invoice ${typedInvoice.invoice_number}.<br/><br/>Remaining balance: <strong>$${remainingBalance.toFixed(2)}</strong>${balanceDate ? ` due by ${formatLongDate(balanceDate)}` : ""}.<br/><br/>You can view your invoice anytime here: <a href="${clientViewLink}">${clientViewLink}</a>.<br/><br/>Thank you for choosing ${business.name}!`
      : `Hi ${clientName},<br/><br/>Thank you! We've received your $${amountJustPaid.toFixed(2)} payment for invoice ${typedInvoice.invoice_number} — your invoice is now <strong>paid in full</strong>! 🎉<br/><br/>You can view your invoice anytime here: <a href="${clientViewLink}">${clientViewLink}</a>.<br/><br/>Thank you for choosing ${business.name}, we look forward to working with you!`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #fdf2f8; padding: 24px 12px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <p style="margin: 0 0 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; color: #db2777;">
          ${business.name.toUpperCase()}
        </p>
        <h1 style="margin: 0; font-size: 20px; color: #1f2937;">Payment received</h1>
        <p style="margin: 4px 0 20px; font-size: 13px; color: #6b7280;">${format(new Date(), "EEEE, MMMM d")}</p>

        <div style="border-left: 3px solid #15803d; background: #f0fdf4; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
            ${clientName}
            <span style="font-weight: 400; color: #6b7280;">· ${typedInvoice.invoice_number}</span>
          </p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #15803d; font-weight: 600;">
            +$${amountJustPaid.toFixed(2)} received
          </p>
          <p style="margin: 2px 0 0; font-size: 13px; color: #4b5563;">
            ${remainingBalance > 0 ? `Remaining balance: $${remainingBalance.toFixed(2)}${balanceDate ? ` due by ${formatLongDate(balanceDate)}` : ""}` : "Paid in full"}
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
          <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: #9ca3af; text-transform: uppercase;">
            Message to send ${clientName}
          </p>
          <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5;">
            ${clientMessage}
          </p>
        </div>

        <a href="${APP_URL}/invoices/${id}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #db2777; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Open invoice →
        </a>
      </div>
    </div>
  `;

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const { error: sendError } = await resend.emails.send({
    from: `${business.name} <${fromAddress}>`,
    to: ownerEmail,
    subject: `Payment received: $${amountJustPaid.toFixed(2)} — ${typedInvoice.invoice_number}`,
    html,
  });

  if (sendError) {
    return NextResponse.json({ updated: true, emailed: false, reason: sendError.message });
  }

  return NextResponse.json({ updated: true, emailed: true });
}
