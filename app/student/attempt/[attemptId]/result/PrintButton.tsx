"use client";

import { Download } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary flex items-center gap-1.5 text-sm print:hidden"
    >
      <Download className="h-3.5 w-3.5" />
      Download PDF
    </button>
  );
}
