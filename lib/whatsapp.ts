/** Build a WhatsApp URL without losing Unicode characters such as emoji. */
export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  const url = new URL(`https://wa.me/${digits}`);
  // NFC keeps visually identical Unicode sequences consistent. URLSearchParams
  // then performs UTF-8 percent encoding exactly once for WhatsApp.
  url.searchParams.set("text", message.normalize("NFC"));
  return url.toString();
}
