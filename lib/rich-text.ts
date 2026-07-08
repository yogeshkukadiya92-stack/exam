const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "div",
  "ul",
  "ol",
  "li",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripUnsafeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, (tag) => {
      const match = tag.match(/^<\/?\s*([a-z0-9]+)/i);
      const name = match?.[1]?.toLowerCase();
      if (!name || !ALLOWED_TAGS.has(name)) return "";
      if (tag.startsWith("</")) return `</${name}>`;
      return name === "br" ? "<br>" : `<${name}>`;
    });
}

export function looksLikeHtml(value: string) {
  return /<\/?(b|strong|i|em|u|br|p|div|ul|ol|li)(\s|>|\/)/i.test(value);
}

export function normalizeRichTextContent(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (!looksLikeHtml(raw)) return escapeHtml(raw).replace(/\r?\n/g, "<br>");
  return stripUnsafeHtml(raw);
}

export function richTextToPlainText(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
