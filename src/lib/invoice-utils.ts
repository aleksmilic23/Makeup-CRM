import { subDays, format, parseISO } from "date-fns";

export const BALANCE_DUE_OPTIONS = [
  { days: 0, label: "On event date" },
  { days: 7, label: "1 week before event" },
  { days: 30, label: "1 month before event" },
] as const;

export function getBalanceDueDate(eventDate: string | null, offsetDays: number): string | null {
  if (!eventDate) return null;
  if (!offsetDays) return eventDate;
  return format(subDays(parseISO(eventDate), offsetDays), "yyyy-MM-dd");
}

// Formats a yyyy-MM-dd (or ISO timestamp) date string as "October 10th, 2026".
export function formatLongDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM do, yyyy");
}

interface PaidInvoiceLike {
  status: string;
  total: number;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  paid_at: string | null;
}

// Sum of what's actually been collected on an invoice so far (deposit + balance settlement).
export function getTotalPaid(invoice: PaidInvoiceLike): number {
  const depositPaid = invoice.deposit_amount != null && invoice.deposit_paid_at ? Number(invoice.deposit_amount) : 0;
  const balancePaid =
    invoice.status === "paid" && invoice.paid_at
      ? Number(invoice.total) - depositPaid
      : 0;
  return depositPaid + balancePaid;
}

export interface NextDueInvoiceLike {
  due_date: string | null;
  event_date: string | null;
  total: number;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  balance_due_offset_days: number;
}

export interface NextDue {
  label: "Deposit" | "Balance";
  amount: number;
  date: string;
}

// The next amount actually owed on an unpaid ("sent") invoice, and when it's due —
// the deposit (if unpaid) or the balance (due relative to the event date), whichever applies.
export function getNextDue(inv: NextDueInvoiceLike): NextDue | null {
  if (inv.deposit_amount != null && !inv.deposit_paid_at) {
    return inv.due_date ? { label: "Deposit", amount: Number(inv.deposit_amount), date: inv.due_date } : null;
  }
  if (inv.deposit_amount != null && inv.deposit_paid_at) {
    const balanceDate = getBalanceDueDate(inv.event_date, inv.balance_due_offset_days);
    return balanceDate
      ? { label: "Balance", amount: Number(inv.total) - Number(inv.deposit_amount), date: balanceDate }
      : null;
  }
  return inv.due_date ? { label: "Balance", amount: Number(inv.total), date: inv.due_date } : null;
}
