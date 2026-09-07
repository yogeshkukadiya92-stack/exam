/** Build a WhatsApp URL without losing Unicode characters such as emoji. */
export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // NFC keeps visually identical Unicode sequences consistent before UTF-8 encoding.
  const text = encodeURIComponent(message.normalize("NFC"));
  return `https://wa.me/${digits}?text=${text}`;
}
