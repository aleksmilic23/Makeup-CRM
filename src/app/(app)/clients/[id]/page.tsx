import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Phone, Mail, AlertTriangle, FileText, CalendarDays, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getTotalPaid } from "@/lib/invoice-utils";
import type { AppointmentWithRelations, Invoice } from "@/lib/database.types";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-red-100 text-red-700",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [{ data: client }, { data: appointments }, { data: invoices }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("appointments")
      .select("*, clients(name), services(name, color)")
      .eq("client_id", id)
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  const totalSpent = (invoices ?? []).reduce((sum, inv) => sum + getTotalPaid(inv), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-pink-100 flex items-center justify-center">
            <span className="text-pink-600 font-bold text-xl">
              {client.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              Client since {format(new Date(client.created_at), "MMM yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/invoices/new?client_id=${id}`}>
            <Button variant="outline" size="sm">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              New Invoice
            </Button>
          </Link>
          <Link href={`/clients/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact & Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.phone && (
              <p className="text-sm flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {client.phone}
              </p>
            )}
            {client.email && (
              <p className="text-sm flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {client.email}
              </p>
            )}
            {client.skin_type && (
              <p className="text-sm">
                <span className="text-muted-foreground">Skin type: </span>
                {client.skin_type}
              </p>
            )}
            {client.allergies && (
              <p className="text-sm flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span><span className="font-medium">Allergies:</span> {client.allergies}</span>
              </p>
            )}
            {client.notes && (
              <p className="text-sm flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                {client.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total spent</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{appointments?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Invoices</CardTitle>
          <Link href={`/invoices/new?client_id=${id}`}>
            <Button size="sm" variant="outline">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              New Invoice
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {(invoices as Invoice[]).map((invoice) => (
                <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted transition-colors border">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.event_date
                          ? `Event ${format(parseISO(invoice.event_date), "MMM d, yyyy")}`
                          : `Issued ${format(parseISO(invoice.issue_date), "MMM d, yyyy")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${Number(invoice.total).toFixed(0)}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${invoiceStatusColors[invoice.status]}`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Appointments</CardTitle>
          <Link href={`/appointments/new?client_id=${id}`}>
            <Button size="sm" variant="outline">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Book
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!appointments || appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No appointments yet.</p>
          ) : (
            <div className="space-y-2">
              {(appointments as AppointmentWithRelations[]).map((appt) => (
                <Link key={appt.id} href={`/appointments/${appt.id}`}>
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted transition-colors border">
                    <div>
                      <p className="text-sm font-medium">{appt.services?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.scheduled_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${Number(appt.price).toFixed(0)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status]}`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
