import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { business } from "@/lib/business";
import { paymentInfo, hasPaymentInfo } from "@/lib/payment-info";
import type { InvoiceWithRelations } from "@/lib/database.types";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured. Set RESEND_API_KEY in .env.local." },
      { status: 500 }
    );
  }

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const typedInvoice = invoice as InvoiceWithRelations;

  if (!typedInvoice.clients.email) {
    return NextResponse.json({ error: "This client has no email address on file" }, { status: 400 });
  }

  const pdfBuffer = await renderInvoicePdf(typedInvoice);

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const scheduleHtml =
    typedInvoice.deposit_amount != null
      ? `
      <p style="margin-top: 16px;"><strong>Payment Schedule</strong><br />
      Deposit (${Number(typedInvoice.deposit_percentage)}%): $${Number(typedInvoice.deposit_amount).toFixed(2)}${
        typedInvoice.due_date ? ` due ${typedInvoice.due_date}` : ""
      } to confirm booking<br />
      Balance: $${(Number(typedInvoice.total) - Number(typedInvoice.deposit_amount)).toFixed(2)}${
        typedInvoice.event_date ? ` due by ${typedInvoice.event_date}` : ""
      }
      </p>
    `
      : "";

  const paymentHtml = hasPaymentInfo()
    ? `
      <p style="margin-top: 16px;"><strong>Payment Details</strong><br />
      ${paymentInfo.bankName ? `Bank: ${paymentInfo.bankName}<br />` : ""}
      ${paymentInfo.accountName ? `Account Name: ${paymentInfo.accountName}<br />` : ""}
      ${paymentInfo.accountNumber ? `Account Number: ${paymentInfo.accountNumber}<br />` : ""}
      ${paymentInfo.routingNumber ? `Routing Number: ${paymentInfo.routingNumber}<br />` : ""}
      ${paymentInfo.otherMethods ? paymentInfo.otherMethods.split("\n").join("<br />") : ""}
      </p>
    `
    : "";

  const resend = new Resend(apiKey);
  const { error: sendError } = await resend.emails.send({
    from: `${business.name} <${fromAddress}>`,
    to: typedInvoice.clients.email,
    replyTo: business.email,
    subject: `Invoice ${typedInvoice.invoice_number} from ${business.name}`,
    html: `
      <p>Hi ${typedInvoice.clients.name},</p>
      <p>Please find attached invoice <strong>${typedInvoice.invoice_number}</strong> for
      <strong>$${Number(typedInvoice.total).toFixed(2)}</strong>${
        typedInvoice.event_date ? ` for your event on ${typedInvoice.event_date}` : ""
      }${
        typedInvoice.deposit_amount == null && typedInvoice.due_date ? `, due ${typedInvoice.due_date}` : ""
      }.</p>
      ${scheduleHtml}
      ${paymentHtml}
      <p>Thank you!<br />${business.name}</p>
    `,
    attachments: [
      {
        filename: `${typedInvoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Email sent, but failed to update invoice status" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
