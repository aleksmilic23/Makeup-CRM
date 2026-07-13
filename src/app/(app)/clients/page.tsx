import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Phone, Mail, User } from "lucide-react";
import type { Client } from "@/lib/database.types";

export const dynamic = "force-dynamic";

async function getClients(): Promise<Client[]> {
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  return data ?? [];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} total</p>
        </div>
        <Link href="/clients/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Client
          </Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first client to get started.</p>
            <Link href="/clients/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                      <span className="text-pink-600 font-semibold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{client.name}</p>
                      {client.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {client.email}
                        </p>
                      )}
                      {client.skin_type && (
                        <span className="inline-block mt-2 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {client.skin_type}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
