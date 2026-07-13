import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Scissors, Clock, DollarSign } from "lucide-react";
import type { Service } from "@/lib/database.types";

async function getServices(): Promise<Service[]> {
  const { data } = await supabase.from("services").select("*").order("name");
  return data ?? [];
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">{services.length} services</p>
        </div>
        <Link href="/services/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Service
          </Button>
        </Link>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Scissors className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No services yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add the services you offer.</p>
            <Link href="/services/new">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Service</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service) => (
            <Link key={service.id} href={`/services/${service.id}/edit`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: service.color + "33" }}
                    >
                      <Scissors className="h-4 w-4" style={{ color: service.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {service.duration_minutes}min
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <DollarSign className="h-3 w-3" />
                          {Number(service.price).toFixed(0)}
                        </span>
                      </div>
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
