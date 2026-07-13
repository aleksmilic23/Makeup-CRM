import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, User, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { AppointmentWithRelations } from "@/lib/database.types";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: appt } = await supabase
    .from("appointments")
    .select("*, clients(id, name, phone, email, skin_type, allergies), services(name, color, description)")
    .eq("id", id)
    .single();

  if (!appt) notFound();

  const appointment = appt as AppointmentWithRelations;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {appointment.clients?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {appointment.services?.name} · {format(new Date(appointment.scheduled_at), "EEEE, MMMM d, yyyy · h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/invoices/new?appointment_id=${id}`}>
            <Button variant="outline" size="sm">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Invoice
            </Button>
          </Link>
          <Link href={`/appointments/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${statusColors[appointment.status]}`}>
              {appointment.status.replace("_", " ")}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${Number(appointment.price).toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: appointment.services?.color ?? "#f9a8d4" }}
            />
            <p className="font-medium text-sm">{appointment.services?.name}</p>
          </div>
          <p className="text-sm text-muted-foreground">{appointment.duration_minutes} minutes</p>
          {appointment.services?.description && (
            <p className="text-sm text-muted-foreground">{appointment.services.description}</p>
          )}
        </CardContent>
      </Card>

      {appointment.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{appointment.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm text-muted-foreground">Client</CardTitle>
          <Link href={`/clients/${appointment.clients?.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <User className="h-3 w-3 mr-1" />
              View Profile
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium text-sm">{appointment.clients?.name}</p>
          {appointment.clients?.phone && (
            <p className="text-sm text-muted-foreground">{appointment.clients.phone}</p>
          )}
          {appointment.clients?.allergies && (
            <p className="text-sm text-amber-600">⚠ {appointment.clients.allergies}</p>
          )}
          {appointment.clients?.skin_type && (
            <p className="text-sm text-muted-foreground">Skin: {appointment.clients.skin_type}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
