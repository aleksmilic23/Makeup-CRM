import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/invoice-form";
import type { InvoiceWithRelations } from "@/lib/database.types";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: invoice }, { data: clients }, { data: services }] = await Promise.all([
    supabase.from("invoices").select("*, clients(*), invoice_items(*)").eq("id", id).single(),
    supabase.from("clients").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
  ]);

  if (!invoice) notFound();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Edit Invoice</h1>
      <InvoiceForm
        invoice={invoice as InvoiceWithRelations}
        clients={clients ?? []}
        services={services ?? []}
      />
    </div>
  );
}
