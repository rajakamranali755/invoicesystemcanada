// HST utilities: format 9 digits as "XXXXX XXXX" (10 chars including the space).
export function formatHst(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return digits.slice(0, 5) + " " + digits.slice(5);
}

export function isValidHst(value: string): boolean {
  if (!value) return true; // empty allowed
  const digits = value.replace(/\D/g, "");
  return digits.length === 9;
}

export const HST_PLACEHOLDER = "12345 6789";