"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Client, Service, Appointment, AppointmentInsert } from "@/lib/database.types";
import { format } from "date-fns";

const STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;

interface Props {
  clients: Client[];
  services: Service[];
  appointment?: Appointment;
  defaultClientId?: string;
}

export function AppointmentForm({ clients, services, appointment, defaultClientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultService = services[0];

  const [form, setForm] = useState<AppointmentInsert>({
    client_id: appointment?.client_id ?? defaultClientId ?? "",
    service_id: appointment?.service_id ?? defaultService?.id ?? "",
    scheduled_at: appointment?.scheduled_at
      ? format(new Date(appointment.scheduled_at), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: appointment?.duration_minutes ?? defaultService?.duration_minutes ?? 60,
    price: appointment?.price ?? defaultService?.price ?? 0,
    status: appointment?.status ?? "scheduled",
    notes: appointment?.notes ?? "",
  });

  function handleServiceChange(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    setForm((prev) => ({
      ...prev,
      service_id: serviceId,
      duration_minutes: svc?.duration_minutes ?? prev.duration_minutes,
      price: svc?.price ?? prev.price,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.service_id) return;
    setLoading(true);

    const payload = {
      ...form,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };

    if (appointment) {
      const { error } = await supabase.from("appointments").update(payload).eq("id", appointment.id);
      if (error) {
        toast.error("Failed to update appointment");
      } else {
        toast.success("Appointment updated");
        router.refresh();
        router.push(`/appointments/${appointment.id}`);
      }
    } else {
      const { data, error } = await supabase.from("appointments").insert(payload).select().single();
      if (error) {
        toast.error("Failed to create appointment");
      } else {
        toast.success("Appointment booked");
        router.push(`/appointments/${data.id}`);
      }
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!appointment) return;
    if (!confirm("Delete this appointment?")) return;
    setLoading(true);
    const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
    if (error) {
      toast.error("Failed to delete");
      setLoading(false);
    } else {
      toast.success("Appointment deleted");
      router.push("/appointments");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {appointment ? "Edit Appointment" : "Book Appointment"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Service *</Label>
              <select
                value={form.service_id}
                onChange={(e) => handleServiceChange(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduled_at">Date & Time *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={form.scheduled_at as string}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                value={form.duration_minutes}
                onChange={(e) => setForm((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
              />
            </div>
            {appointment && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value || null }))}
              rows={2}
              placeholder="Any notes for this appointment..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : appointment ? "Save Changes" : "Book Appointment"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            {appointment && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
