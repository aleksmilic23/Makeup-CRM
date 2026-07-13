import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/service-form";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: service } = await supabase.from("services").select("*").eq("id", id).single();
  if (!service) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit Service</h1>
      <ServiceForm service={service} />
    </div>
  );
}
