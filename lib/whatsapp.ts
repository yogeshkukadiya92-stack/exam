type WhatsAppTarget = "app" | "business" | "mobile";

/** Build a WhatsApp URL without losing Unicode characters such as emoji. */
export function buildWhatsAppUrl(phone: string, message: string, target: WhatsAppTarget = "app") {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // NFC keeps visually identical Unicode sequences consistent before UTF-8 encoding.
  const text = encodeURIComponent(message.normalize("NFC"));
  const endpoints: Record<WhatsAppTarget, string> = {
    app: "whatsapp://send",
    business: "whatsapp-business://send",
    mobile: "https://api.whatsapp.com/send",
  };
  const endpoint = endpoints[target];
  return `${endpoint}?phone=${digits}&text=${text}`;
}
