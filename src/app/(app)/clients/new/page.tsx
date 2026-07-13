import { ClientForm } from "@/components/client-form";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">New Client</h1>
      <ClientForm />
    </div>
  );
}
