import { supabase } from "@/lib/supabase";
import { InvoiceForm } from "@/components/invoice-form";
import type { AppointmentWithRelations } from "@/lib/database.types";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; appointment_id?: string }>;
}) {
  const { client_id, appointment_id } = await searchParams;

  const [{ data: clients }, { data: services }, appointmentResult] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
    appointment_id
      ? supabase
          .from("appointments")
          .select("*, clients(*), services(name, color)")
          .eq("id", appointment_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const appointment = appointmentResult.data as AppointmentWithRelations | null;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
      <InvoiceForm
        clients={clients ?? []}
        services={services ?? []}
        defaultClientId={appointment?.client_id ?? client_id}
        defaultAppointmentId={appointment?.id}
        defaultItems={
          appointment
            ? [
                {
                  key: "prefill",
                  description: appointment.services?.name ?? "Service",
                  quantity: 1,
                  unit_price: Number(appointment.price),
                },
              ]
            : undefined
        }
      />
    </div>
  );
}
