import { ServiceForm } from "@/components/service-form";

export default function NewServicePage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">New Service</h1>
      <ServiceForm />
    </div>
  );
}
