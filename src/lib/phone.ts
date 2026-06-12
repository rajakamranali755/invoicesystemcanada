// Phone format: 123-456-7890 (exactly 10 digits).
export function formatPhone(raw: string): string {
  const d = (raw || "").replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export const PHONE_PLACEHOLDER = "123-456-7890";