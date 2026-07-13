import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/lib/database.types";

async function getDashboardData() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [
    { count: totalClients },
    { count: todayAppointments },
    { data: monthAppointments },
    { data: upcomingAppointments },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_at", startOfDay)
      .lte("scheduled_at", endOfDay),
    supabase
      .from("appointments")
      .select("price")
      .gte("scheduled_at", startOfMonth)
      .eq("status", "completed"),
    supabase
      .from("appointments")
      .select("*, clients(name, phone), services(name, color)")
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
  ]);

  const monthRevenue = monthAppointments?.reduce((sum, a) => sum + Number(a.price), 0) ?? 0;

  return {
    totalClients: totalClients ?? 0,
    todayAppointments: todayAppointments ?? 0,
    monthRevenue,
    upcomingAppointments: (upcomingAppointments ?? []) as AppointmentWithRelations[],
  };
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

export default async function DashboardPage() {
  const { totalClients, todayAppointments, monthRevenue, upcomingAppointments } =
    await getDashboardData();

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
          </CardContent>
        </Card>
      </div>

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
