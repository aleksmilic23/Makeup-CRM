import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).single();
  if (!client) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
      <ClientForm client={client} />
    </div>
  );
}
