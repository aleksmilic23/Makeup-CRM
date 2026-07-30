"use client";

import { Download, Loader2 } from "lucide-react";
import { usePdfDownload } from "@/components/pdf-download-button";

interface Props {
  invoiceId: string;
  filename: string;
}

export function ClientPdfLink({ invoiceId, filename }: Props) {
  const { downloading, download } = usePdfDownload(invoiceId, filename);

  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
    >
      {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      PDF
    </button>
  );
}
