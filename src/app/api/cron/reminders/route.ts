import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { format, addDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { business } from "@/lib/business";
import { getNextDue, formatLongDate, type NextDueInvoiceLike } from "@/lib/invoice-utils";

type ReminderInvoiceRow = NextDueInvoiceLike & {
  id: string;
  invoice_number: string;
  clients: { name: string } | null;
};

const APP_URL = "https://makeup-crm-three.vercel.app";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!ownerEmail || !apiKey) {
    return NextResponse.json({ error: "OWNER_EMAIL or RESEND_API_KEY not configured" }, { status: 500 });
  }

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, total, due_date, event_date, deposit_amount, deposit_paid_at, balance_due_offset_days, clients(name)"
    )
    .eq("status", "sent");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const in3DaysStr = format(addDays(new Date(), 3), "yyyy-MM-dd");

  const dueSoon: { invoice: ReminderInvoiceRow; due: NonNullable<ReturnType<typeof getNextDue>> }[] = [];
  const overdue: { invoice: ReminderInvoiceRow; due: NonNullable<ReturnType<typeof getNextDue>> }[] = [];

  for (const invoice of (invoices ?? []) as unknown as ReminderInvoiceRow[]) {
    const due = getNextDue(invoice);
    if (!due) continue;
    if (due.date === in3DaysStr) dueSoon.push({ invoice, due });
    else if (due.date < todayStr) overdue.push({ invoice, due });
  }

  if (dueSoon.length === 0 && overdue.length === 0) {
    return NextResponse.json({ skipped: true, reason: "Nothing due soon or overdue" });
  }

  const buildClientMessage = (
    item: { invoice: ReminderInvoiceRow; due: NonNullable<ReturnType<typeof getNextDue>> },
    isOverdue: boolean,
    invoiceLink: string
  ) => {
    const name = item.invoice.clients?.name ?? "there";
    const amount = `$${item.due.amount.toFixed(2)}`;
    const label = item.due.label.toLowerCase();
    const dateLong = formatLongDate(item.due.date);
    if (isOverdue) {
      return `Hi ${name},<br/><br/>Just a friendly reminder that your ${amount} ${label} for invoice ${item.invoice.invoice_number} was due on ${dateLong} and hasn't been received yet. You can view and submit payment here: <a href="${invoiceLink}">${invoiceLink}</a>.<br/><br/>Let me know if you have any questions — thank you!`;
    }
    return `Hi ${name},<br/><br/>Just a heads up that your ${amount} ${label} for invoice ${item.invoice.invoice_number} is due on ${dateLong}. You can view and submit payment here: <a href="${invoiceLink}">${invoiceLink}</a>.<br/><br/>Looking forward to working with you — let me know if you need anything!`;
  };

  const renderCard = (
    item: { invoice: ReminderInvoiceRow; due: NonNullable<ReturnType<typeof getNextDue>> },
    accent: string,
    bg: string,
    isOverdue: boolean
  ) => {
    const invoiceLink = `${APP_URL}/invoices/${item.invoice.id}`;
    return `
    <div style="border-left: 3px solid ${accent}; background: ${bg}; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">
        ${item.invoice.clients?.name ?? "Unknown client"}
        <span style="font-weight: 400; color: #6b7280;">· ${item.invoice.invoice_number}</span>
      </p>
      <p style="margin: 4px 0 10px; font-size: 13px; color: #4b5563;">
        ${item.due.label}: <strong>$${item.due.amount.toFixed(2)}</strong> ${isOverdue ? "was due" : "due"} ${formatLongDate(item.due.date)}
      </p>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px;">
        <p style="margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: #9ca3af; text-transform: uppercase;">
          Message to send ${item.invoice.clients?.name ?? "client"}
        </p>
        <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5;">
          ${buildClientMessage(item, isOverdue, invoiceLink)}
        </p>
      </div>
      <p style="margin: 8px 0 0;">
        <a href="${invoiceLink}" style="font-size: 12px; font-weight: 600; color: ${accent}; text-decoration: none;">
          Open invoice →
        </a>
      </p>
    </div>
  `;
  };

  const sectionHeading = (label: string, count: number, color: string) => `
    <p style="margin: 20px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: ${color}; text-transform: uppercase;">
      ${label} (${count})
    </p>
  `;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background: #fdf2f8; padding: 24px 12px;">
      <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <p style="margin: 0 0 2px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; color: #db2777;">
          ${business.name.toUpperCase()}
        </p>
        <h1 style="margin: 0; font-size: 20px; color: #1f2937;">Payment reminders</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">${format(new Date(), "EEEE, MMMM d")}</p>

        ${
          overdue.length > 0
            ? sectionHeading("Overdue", overdue.length, "#b91c1c") +
              overdue.map((item) => renderCard(item, "#b91c1c", "#fef2f2", true)).join("")
            : ""
        }
        ${
          dueSoon.length > 0
            ? sectionHeading("Due in 3 days", dueSoon.length, "#b45309") +
              dueSoon.map((item) => renderCard(item, "#d97706", "#fffbeb", false)).join("")
            : ""
        }

        <a href="${APP_URL}/invoices" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #db2777; color: #ffffff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
          View all invoices →
        </a>
      </div>
    </div>
  `;

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const { error: sendError } = await resend.emails.send({
    from: `${business.name} <${fromAddress}>`,
    to: ownerEmail,
    subject: `${overdue.length + dueSoon.length} invoice${overdue.length + dueSoon.length === 1 ? "" : "s"} need${
      overdue.length + dueSoon.length === 1 ? "s" : ""
    } attention`,
    html,
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 502 });
  }

  return NextResponse.json({ sent: true, dueSoon: dueSoon.length, overdue: overdue.length });
}
