/** Build a WhatsApp URL without losing Unicode characters such as emoji. */
export function buildWhatsAppUrl(phone: string, message: string, mobile = false) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // NFC keeps visually identical Unicode sequences consistent before UTF-8 encoding.
  const text = encodeURIComponent(message.normalize("NFC"));
  // Open Web directly on desktop, avoiding the short-link/app handoff.
  const endpoint = mobile ? "https://api.whatsapp.com/send" : "https://web.whatsapp.com/send";
  return `${endpoint}?phone=${digits}&text=${text}`;
}
