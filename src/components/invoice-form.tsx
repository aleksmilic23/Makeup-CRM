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
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { BALANCE_DUE_OPTIONS, getBalanceDueDate } from "@/lib/invoice-utils";
import type { Client, Service, InvoiceWithRelations } from "@/lib/database.types";

interface LineItem {
  key: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  clients: Client[];
  services: Service[];
  invoice?: InvoiceWithRelations;
  defaultClientId?: string;
  defaultAppointmentId?: string;
  defaultItems?: LineItem[];
}

function newKey() {
  return Math.random().toString(36).slice(2);
}

export function InvoiceForm({
  clients,
  services,
  invoice,
  defaultClientId,
  defaultAppointmentId,
  defaultItems,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState(invoice?.client_id ?? defaultClientId ?? "");
  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "");
  const [eventDate, setEventDate] = useState(invoice?.event_date ?? "");
  const [taxRate, setTaxRate] = useState(invoice?.tax_rate ?? 0);
  const [requireDeposit, setRequireDeposit] = useState(invoice?.deposit_amount != null);
  const [depositPercentage, setDepositPercentage] = useState(invoice?.deposit_percentage ?? 50);
  const [balanceDueOffset, setBalanceDueOffset] = useState(invoice?.balance_due_offset_days ?? 7);
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(
    invoice
      ? invoice.invoice_items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            key: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
          }))
      : defaultItems ?? [{ key: newKey(), description: "", quantity: 1, unit_price: 0 }]
  );

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  const depositAmount = requireDeposit ? total * (depositPercentage / 100) : 0;
  const balanceAmount = total - depositAmount;
  const balanceDueDate = getBalanceDueDate(eventDate || null, balanceDueOffset);

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { key: newKey(), description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  function addServiceItem(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setItems((prev) => [
      ...prev,
      { key: newKey(), description: svc.name, quantity: 1, unit_price: Number(svc.price) },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((item) => item.description.trim());
    if (!clientId || validItems.length === 0) {
      toast.error("Select a client and add at least one line item");
      return;
    }
    setLoading(true);

    const invoicePayload = {
      client_id: clientId,
      appointment_id: invoice?.appointment_id ?? defaultAppointmentId ?? null,
      issue_date: issueDate,
      due_date: dueDate || null,
      event_date: eventDate || null,
      notes: notes || null,
      tax_rate: taxRate,
      subtotal: Number(subtotal.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      deposit_percentage: requireDeposit ? depositPercentage : null,
      deposit_amount: requireDeposit ? Number(depositAmount.toFixed(2)) : null,
      deposit_paid_at: requireDeposit ? invoice?.deposit_paid_at ?? null : null,
      balance_due_offset_days: requireDeposit ? balanceDueOffset : 7,
    };

    if (invoice) {
      const { error: updateError } = await supabase
        .from("invoices")
        .update(invoicePayload)
        .eq("id", invoice.id);

      if (updateError) {
        toast.error("Failed to update invoice");
        setLoading(false);
        return;
      }

      await supabase.from("invoice_items").delete().eq("invoice_id", invoice.id);
      const { error: itemsError } = await supabase.from("invoice_items").insert(
        validItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Number((item.quantity * item.unit_price).toFixed(2)),
          sort_order: index,
        }))
      );

      if (itemsError) {
        toast.error("Invoice updated, but failed to save line items");
        setLoading(false);
        return;
      }

      toast.success("Invoice updated");
      router.push(`/invoices/${invoice.id}`);
    } else {
      const { data: invoiceNumber, error: numberError } = await supabase.rpc("next_invoice_number");
      if (numberError || !invoiceNumber) {
        toast.error("Failed to generate invoice number");
        setLoading(false);
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from("invoices")
        .insert({ ...invoicePayload, invoice_number: invoiceNumber, status: "draft" })
        .select()
        .single();

      if (insertError || !created) {
        toast.error("Failed to create invoice");
        setLoading(false);
        return;
      }

      const { error: itemsError } = await supabase.from("invoice_items").insert(
        validItems.map((item, index) => ({
          invoice_id: created.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: Number((item.quantity * item.unit_price).toFixed(2)),
          sort_order: index,
        }))
      );

      if (itemsError) {
        toast.error("Invoice created, but failed to save line items");
        setLoading(false);
        return;
      }

      toast.success("Invoice created");
      router.push(`/invoices/${created.id}`);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!confirm("Delete this invoice?")) return;
    setLoading(true);
    const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
    if (error) {
      toast.error("Failed to delete");
      setLoading(false);
    } else {
      toast.success("Invoice deleted");
      router.push("/invoices");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{invoice ? "Edit Invoice" : "New Invoice"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Client *</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
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
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                type="date"
                value={eventDate ?? ""}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items *</Label>
              {services.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && addServiceItem(e.target.value)}
                  className="h-7 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">+ Add from services</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, { description: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                    className="w-16"
                    aria-label="Quantity"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unit_price}
                    onChange={(e) => updateItem(item.key, { unit_price: Number(e.target.value) })}
                    className="w-24"
                    aria-label="Unit price"
                  />
                  <span className="w-20 text-right text-sm">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.key)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min={0}
                step={0.01}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
              {taxRate > 0 && (
                <p className="text-sm text-muted-foreground">Tax: ${taxAmount.toFixed(2)}</p>
              )}
              <p className="text-base font-semibold">Total: ${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={requireDeposit}
                onChange={(e) => setRequireDeposit(e.target.checked)}
                className="h-4 w-4"
              />
              Require a deposit to book
            </label>
            {requireDeposit && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={depositPercentage}
                      onChange={(e) => setDepositPercentage(Number(e.target.value))}
                      className="w-20"
                      aria-label="Deposit percentage"
                    />
                    <span className="text-sm text-muted-foreground">% deposit</span>
                  </div>
                  <p className="text-sm">
                    Deposit: <span className="font-medium">${depositAmount.toFixed(2)}</span>
                    {dueDate ? ` due ${dueDate}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <select
                    value={balanceDueOffset}
                    onChange={(e) => setBalanceDueOffset(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {BALANCE_DUE_OPTIONS.map((opt) => (
                      <option key={opt.days} value={opt.days}>
                        Balance due: {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Balance: ${balanceAmount.toFixed(2)}
                    {balanceDueDate ? ` due by ${balanceDueDate}` : " due by event date (not set)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment terms, thank-you note, etc."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Saving..." : invoice ? "Save Changes" : "Create Invoice"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
              Cancel
            </Button>
            {invoice && (
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
