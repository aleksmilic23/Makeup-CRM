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
import type { Service, ServiceInsert } from "@/lib/database.types";

const COLORS = [
  "#f9a8d4", "#fda4af", "#fb923c", "#fcd34d",
  "#bbf7d0", "#6ee7b7", "#7dd3fc", "#c4b5fd",
];

export function ServiceForm({ service }: { service?: Service }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ServiceInsert>({
    name: service?.name ?? "",
    description: service?.description ?? "",
    duration_minutes: service?.duration_minutes ?? 60,
    price: service?.price ?? 0,
    color: service?.color ?? "#f9a8d4",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);

    if (service) {
      const { error } = await supabase.from("services").update(form).eq("id", service.id);
      if (error) toast.error("Failed to update");
      else { toast.success("Service updated"); router.refresh(); router.push("/services"); }
    } else {
      const { error } = await supabase.from("services").insert(form);
      if (error) toast.error("Failed to create");
      else { toast.success("Service created"); router.push("/services"); }
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!service) return;
    if (!confirm("Delete this service?")) return;
    setLoading(true);
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    if (error) { toast.error("Failed to delete"); setLoading(false); }
    else { toast.success("Service deleted"); router.push("/services"); }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{service ? "Edit Service" : "New Service"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="e.g. Full Makeup"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))}
              rows={2}
              placeholder="Brief description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    form.color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : service ? "Save Changes" : "Create Service"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            {service && (
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
