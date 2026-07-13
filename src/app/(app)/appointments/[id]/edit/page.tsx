import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointment-form";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: appt }, { data: clients }, { data: services }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", id).single(),
    supabase.from("clients").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
  ]);

  if (!appt) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit Appointment</h1>
      <AppointmentForm appointment={appt} clients={clients ?? []} services={services ?? []} />
    </div>
  );
}
