"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100 print:hidden"
    >
      ⬇ Download PDF
    </button>
  );
}
