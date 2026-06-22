export function normalizePhoneNumber(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }

  const digits = compact.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00") && digits.length > 2) return `+${digits.slice(2)}`;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`;
  if (digits.startsWith("33") && digits.length === 11) return `+${digits}`;
  return `+${digits}`;
}

export function formatPhoneNumber(value: string | null | undefined) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) return "";

  if (normalized.startsWith("+33") && normalized.length === 12) {
    const local = `0${normalized.slice(3)}`;
    return local.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }

  return normalized;
}
