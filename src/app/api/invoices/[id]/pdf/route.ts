import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import type { InvoiceWithRelations } from "@/lib/database.types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(*), invoice_items(*)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const typedInvoice = invoice as InvoiceWithRelations;
  const pdfBuffer = await renderInvoicePdf(typedInvoice);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${typedInvoice.invoice_number}.pdf"`,
    },
  });
}
