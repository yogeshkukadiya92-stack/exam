export function normalizePhoneNumber(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (hasPlus && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;

  return null;
}

export function phoneLookupValues(value: string | null | undefined) {
  const raw = value?.trim();
  const normalized = normalizePhoneNumber(raw);
  return Array.from(new Set([raw, normalized].filter(Boolean))) as string[];
}
