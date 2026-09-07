"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function WhatsAppResult({ phone, message, studentName }: {
  phone: string;
  message: string;
  studentName: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const appUrl = buildWhatsAppUrl(phone, message, "app");
  const businessUrl = buildWhatsAppUrl(phone, message, "business");
  const mobileUrl = buildWhatsAppUrl(phone, message, "mobile");
  if (!appUrl || !businessUrl || !mobileUrl) return null;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus("Copied! Paste into WhatsApp.");
    } catch {
      setShowMessage(true);
      setCopyStatus("Select and copy the message below.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <a
          href={appUrl}
          onClick={(event) => {
            const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
              || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            event.currentTarget.href = mobile ? mobileUrl : appUrl;
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          aria-label={`Send WhatsApp result to ${studentName}`}
        >
          <MessageCircle className="h-4 w-4" />
          Send WhatsApp
        </a>
        <a
          href={businessUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          aria-label={`Send WhatsApp Business result to ${studentName}`}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Business
        </a>
      </div>
      <div className="flex gap-3 text-xs text-emerald-700">
        <button type="button" onClick={copyMessage}>Copy message</button>
        <button type="button" aria-expanded={showMessage} onClick={() => setShowMessage(!showMessage)}>
          {showMessage ? "Hide message" : "Preview message"}
        </button>
      </div>
      <span role="status" className="text-xs text-slate-600">{copyStatus}</span>
      {showMessage && (
        <textarea
          aria-label={`Result message for ${studentName}`}
          readOnly
          value={message}
          rows={10}
          className="w-72 max-w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
