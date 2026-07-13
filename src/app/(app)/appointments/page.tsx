import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/lib/database.types";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

async function getAppointments(): Promise<AppointmentWithRelations[]> {
  const { data } = await supabase
    .from("appointments")
    .select("*, clients(name, phone), services(name, color)")
    .order("scheduled_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AppointmentWithRelations[];
}

export default async function AppointmentsPage() {
  const appointments = await getAppointments();

  const grouped = appointments.reduce<Record<string, AppointmentWithRelations[]>>((acc, appt) => {
    const date = format(new Date(appt.scheduled_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(appt);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">{appointments.length} total</p>
        </div>
        <Link href="/appointments/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Book Appointment
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
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
            .map(([date, appts]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  {format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="space-y-2">
                  {appts.map((appt) => (
                    <Link key={appt.id} href={`/appointments/${appt.id}`}>
                      <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: appt.services?.color ?? "#f9a8d4" }}
                              />
                              <div>
                                <p className="text-sm font-medium">{appt.clients?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {appt.services?.name} · {format(new Date(appt.scheduled_at), "h:mm a")} · {appt.duration_minutes}min
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">${Number(appt.price).toFixed(0)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status]}`}>
                                {appt.status.replace("_", " ")}
                              </span>
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
