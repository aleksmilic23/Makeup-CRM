import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, TrendingUp, Receipt, AlertTriangle } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { getNextDue } from "@/lib/invoice-utils";
import type { AppointmentWithRelations } from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface DueSoonInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  label: "Deposit" | "Balance";
  amount: number;
  date: string;
  overdue: boolean;
}

interface PaymentEvent {
  key: string;
  id: string;
  invoiceNumber: string;
  clientName: string;
  label: "Deposit" | "Paid in Full" | "Balance Paid";
  amount: number;
  date: string;
}

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "void";
  total: number;
  due_date: string | null;
  event_date: string | null;
  deposit_amount: number | null;
  deposit_paid_at: string | null;
  balance_due_offset_days: number;
  paid_at: string | null;
  clients: { name: string } | null;
};

async function getDashboardData() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const monthKey = format(new Date(), "yyyy-MM");

  const [
    { count: totalClients },
    { count: todayAppointments },
    { data: upcomingAppointments },
    { data: allInvoices },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_at", startOfDay)
      .lte("scheduled_at", endOfDay),
    supabase
      .from("appointments")
      .select("*, clients(name, phone), services(name, color)")
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, status, total, due_date, event_date, deposit_amount, deposit_paid_at, balance_due_offset_days, paid_at, clients(name)"
      )
      .in("status", ["sent", "paid"]),
  ]);

  const invoices = (allInvoices ?? []) as unknown as InvoiceRow[];
  const unpaidInvoices = invoices.filter((inv) => inv.status === "sent");

  const outstandingBalance = unpaidInvoices.reduce((sum, inv) => {
    const remaining =
      inv.deposit_amount != null && inv.deposit_paid_at
        ? Number(inv.total) - Number(inv.deposit_amount)
        : Number(inv.total);
    return sum + remaining;
  }, 0);

  const overdueInvoices = unpaidInvoices.filter((inv) => {
    const nextDue = getNextDue(inv);
    return nextDue != null && nextDue.date < todayDate;
  }).length;

  const dueSoonCutoff = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const dueSoonInvoices: DueSoonInvoice[] = unpaidInvoices
    .map((inv) => {
      const nextDue = getNextDue(inv);
      if (!nextDue || nextDue.date > dueSoonCutoff) return null;
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.clients?.name ?? "",
        label: nextDue.label,
        amount: nextDue.amount,
        date: nextDue.date,
        overdue: nextDue.date < todayDate,
      };
    })
    .filter((x): x is DueSoonInvoice => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  // Payment events: a deposit being paid and/or an invoice being marked paid, each dated by when it happened.
  const paymentEvents: PaymentEvent[] = invoices.flatMap((inv) => {
    const events: PaymentEvent[] = [];
    const hasDeposit = inv.deposit_amount != null;
    if (hasDeposit && inv.deposit_paid_at) {
      events.push({
        key: `${inv.id}-deposit`,
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.clients?.name ?? "",
        label: "Deposit",
        amount: Number(inv.deposit_amount),
        date: inv.deposit_paid_at,
      });
    }
    if (inv.status === "paid" && inv.paid_at) {
      events.push({
        key: `${inv.id}-paid`,
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.clients?.name ?? "",
        label: hasDeposit && inv.deposit_paid_at ? "Balance Paid" : "Paid in Full",
        amount: hasDeposit && inv.deposit_paid_at ? Number(inv.total) - Number(inv.deposit_amount) : Number(inv.total),
        date: inv.paid_at,
      });
    }
    return events;
  });

  const monthRevenue = paymentEvents
    .filter((e) => e.date.slice(0, 7) === monthKey)
    .reduce((sum, e) => sum + e.amount, 0);

  const recentPayments = [...paymentEvents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return {
    totalClients: totalClients ?? 0,
    todayAppointments: todayAppointments ?? 0,
    monthRevenue,
    upcomingAppointments: (upcomingAppointments ?? []) as AppointmentWithRelations[],
    outstandingBalance,
    overdueInvoices: overdueInvoices ?? 0,
    dueSoonInvoices,
    recentPayments,
  };
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

export default async function DashboardPage() {
  const {
    totalClients,
    todayAppointments,
    monthRevenue,
    upcomingAppointments,
    outstandingBalance,
    overdueInvoices,
    dueSoonInvoices,
    recentPayments,
  } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todayAppointments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Month Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${monthRevenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Deposits &amp; payments collected</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${outstandingBalance.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Sent, unpaid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Invoices</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueInvoices > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${overdueInvoices > 0 ? "text-amber-600" : ""}`}>{overdueInvoices}</p>
            <p className="text-xs text-muted-foreground mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices Due Soon</CardTitle>
        </CardHeader>
        <CardContent>
          {dueSoonInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nothing due in the next 7 days.</p>
          ) : (
            <div className="space-y-1">
              {dueSoonInvoices.map((item) => (
                <Link
                  key={item.id}
                  href={`/invoices/${item.id}`}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b last:border-0 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.invoiceNumber} · {item.label} due {format(parseISO(item.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">${item.amount.toFixed(2)}</span>
                    {item.overdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                        overdue
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {recentPayments.map((item) => (
                <Link
                  key={item.key}
                  href={`/invoices/${item.id}`}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b last:border-0 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.invoiceNumber} · {item.label} · {format(new Date(item.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-green-700">+${item.amount.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{appt.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.services?.name} · {format(new Date(appt.scheduled_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">${Number(appt.price).toFixed(0)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status]}`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
