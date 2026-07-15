import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CalendarDays, Receipt, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

interface ListItem {
  id: string;
  type: "appointment" | "invoice";
  href: string;
  clientName: string;
  label: string;
  meta: string;
  amount: number;
  color?: string;
  statusBadge?: string;
  dateKey: string;
  sortKey: string;
}

async function getListItems(): Promise<ListItem[]> {
  const [{ data: appointments }, { data: invoiceEvents }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, clients(name, phone), services(name, color)")
      .order("scheduled_at", { ascending: false })
      .limit(100),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, event_date, clients(name)")
      .in("status", ["sent", "paid"])
      .is("appointment_id", null)
      .not("event_date", "is", null)
      .limit(100),
  ]);

  const appointmentItems: ListItem[] = ((appointments ?? []) as AppointmentWithRelations[]).map((appt) => ({
    id: appt.id,
    type: "appointment",
    href: `/appointments/${appt.id}`,
    clientName: appt.clients?.name ?? "",
    label: appt.services?.name ?? "",
    meta: `${format(new Date(appt.scheduled_at), "h:mm a")} · ${appt.duration_minutes}min`,
    amount: Number(appt.price),
    color: appt.services?.color ?? "#f9a8d4",
    statusBadge: appt.status,
    dateKey: format(new Date(appt.scheduled_at), "yyyy-MM-dd"),
    sortKey: appt.scheduled_at,
  }));

  const invoiceItems: ListItem[] = (
    (invoiceEvents ?? []) as { id: string; invoice_number: string; total: number; event_date: string; clients: { name: string } | null }[]
  ).map((inv) => ({
    id: inv.id,
    type: "invoice",
    href: `/invoices/${inv.id}`,
    clientName: inv.clients?.name ?? "",
    label: inv.invoice_number,
    meta: "Event date",
    amount: Number(inv.total),
    dateKey: inv.event_date,
    sortKey: `${inv.event_date}T12:00:00`,
  }));

  return [...appointmentItems, ...invoiceItems].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export default async function AppointmentsPage() {
  const items = await getListItems();

  const grouped = items.reduce<Record<string, ListItem[]>>((acc, item) => {
    if (!acc[item.dateKey]) acc[item.dateKey] = [];
    acc[item.dateKey].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">{items.length} total</p>
        </div>
        <Link href="/appointments/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Book Appointment
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No appointments yet</p>
            <p className="text-sm text-muted-foreground mb-4">Book your first appointment.</p>
            <Link href="/appointments/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Book Appointment
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayItems]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  {format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <Link key={`${item.type}-${item.id}`} href={item.href}>
                      <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.type === "appointment" ? (
                                <div
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                              ) : (
                                <Receipt className="h-3.5 w-3.5 shrink-0 text-pink-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.clientName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.label} · {item.meta}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">${item.amount.toFixed(0)}</span>
                              {item.statusBadge ? (
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.statusBadge]}`}
                                >
                                  {item.statusBadge.replace("_", " ")}
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-pink-100 text-pink-700 flex items-center gap-1">
                                  <CalendarCheck className="h-3 w-3" />
                                  booked
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
