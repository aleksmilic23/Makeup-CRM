"use client";

import { useState } from "react";
import { toast } from "sonner";

export function usePdfDownload(invoiceId: string, filename: string) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!res.ok) throw new Error("Failed to fetch PDF");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        toast.error("Failed to download PDF");
      }
    }
    setDownloading(false);
  }

  return { downloading, download };
}
