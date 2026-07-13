import { supabase } from "@/lib/supabase";
import { AppointmentForm } from "@/components/appointment-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;

  const [{ data: clients }, { data: services }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Book Appointment</h1>
      <AppointmentForm
        clients={clients ?? []}
        services={services ?? []}
        defaultClientId={client_id}
      />
    </div>
  );
}
