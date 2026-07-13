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
import type { Client, ClientInsert } from "@/lib/database.types";

const SKIN_TYPES = ["Normal", "Dry", "Oily", "Combination", "Sensitive"];

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ClientInsert>({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    skin_type: client?.skin_type ?? "",
    allergies: client?.allergies ?? "",
    notes: client?.notes ?? "",
  });

  const set = (field: keyof ClientInsert, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value || null }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);

    if (client) {
      const { error } = await supabase.from("clients").update(form).eq("id", client.id);
      if (error) {
        toast.error("Failed to update client");
      } else {
        toast.success("Client updated");
        router.refresh();
        router.push(`/clients/${client.id}`);
      }
    } else {
      const { data, error } = await supabase.from("clients").insert(form).select().single();
      if (error) {
        toast.error("Failed to create client");
      } else {
        toast.success("Client created");
        router.push(`/clients/${data.id}`);
      }
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!client) return;
    if (!confirm("Delete this client? All their appointments will also be removed.")) return;
    setLoading(true);
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) {
      toast.error("Failed to delete client");
      setLoading(false);
    } else {
      toast.success("Client deleted");
      router.push("/clients");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{client ? "Edit Client" : "New Client"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skin_type">Skin Type</Label>
              <select
                id="skin_type"
                value={form.skin_type ?? ""}
                onChange={(e) => set("skin_type", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select skin type</option>
                {SKIN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies / Sensitivities</Label>
            <Input
              id="allergies"
              value={form.allergies ?? ""}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="e.g. latex, fragrance..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Any additional notes about this client..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : client ? "Save Changes" : "Create Client"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            {client && (
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
