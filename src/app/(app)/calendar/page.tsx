import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  format,
  parse,
} from "date-fns";
import type { AppointmentWithRelations, Invoice } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type InvoiceEvent = Invoice & { clients: { name: string } | null };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const baseDate = month ? parse(`${month}-01`, "yyyy-MM-dd", new Date()) : new Date();
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rangeStart = format(monthStart, "yyyy-MM-dd");
  const rangeEndExclusive = format(addMonths(monthStart, 1), "yyyy-MM-dd");

  const [{ data: appointments }, { data: invoices }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, clients(name), services(name, color)")
      .gte("scheduled_at", rangeStart)
      .lt("scheduled_at", rangeEndExclusive),
    supabase
      .from("invoices")
      .select("*, clients(name)")
      .in("status", ["sent", "paid"])
      .gte("event_date", rangeStart)
      .lt("event_date", rangeEndExclusive),
  ]);

  const apptsByDay = new Map<string, AppointmentWithRelations[]>();
  for (const appt of (appointments ?? []) as AppointmentWithRelations[]) {
    const key = format(new Date(appt.scheduled_at), "yyyy-MM-dd");
    if (!apptsByDay.has(key)) apptsByDay.set(key, []);
    apptsByDay.get(key)!.push(appt);
  }

  const invoicesByDay = new Map<string, InvoiceEvent[]>();
  for (const invoice of (invoices ?? []) as InvoiceEvent[]) {
    if (!invoice.event_date) continue;
    if (!invoicesByDay.has(invoice.event_date)) invoicesByDay.set(invoice.event_date, []);
    invoicesByDay.get(invoice.event_date)!.push(invoice);
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const thisMonth = format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{format(monthStart, "MMMM yyyy")}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?month=${prevMonth}`}>
            <Button variant="outline" size="icon-sm" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/calendar?month=${thisMonth}`}>
            <Button variant="outline" size="sm">
              Today
            </Button>
          </Link>
          <Link href={`/calendar?month=${nextMonth}`}>
            <Button variant="outline" size="icon-sm" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pink-400" /> Appointment
        </span>
        <span className="flex items-center gap-1.5">
          <Receipt className="h-3 w-3" /> Invoice event date
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-card px-1 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, monthStart);
              const today = isSameDay(day, new Date());
              const dayAppts = apptsByDay.get(key) ?? [];
              const dayInvoices = invoicesByDay.get(key) ?? [];

              return (
                <div
                  key={key}
                  className={cn(
                    "bg-card min-h-[84px] sm:min-h-[110px] p-1 sm:p-1.5 space-y-0.5",
                    !inMonth && "bg-muted/30"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      today ? "bg-pink-600 font-semibold text-white" : "text-foreground",
                      !inMonth && !today && "text-muted-foreground/50"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayAppts.map((appt) => (
                      <Link
                        key={appt.id}
                        href={`/appointments/${appt.id}`}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] sm:text-[11px] hover:bg-muted"
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: appt.services?.color ?? "#f9a8d4" }}
                        />
                        <span className="truncate">{appt.clients?.name}</span>
                      </Link>
                    ))}
                    {dayInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center gap-1 truncate rounded bg-pink-50 px-1 py-0.5 text-[10px] text-pink-700 hover:bg-pink-100 sm:text-[11px]"
                      >
                        <Receipt className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{invoice.clients?.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
