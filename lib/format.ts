const WIB_TIMEZONE = "Asia/Jakarta";

export function rupiah(value: number): string {
  if (!Number.isFinite(value)) return "Rp0";
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));
  return `${sign}Rp${formatted}`;
}

export type AngkaOptions = {
  minFractionDigits?: number;
  maxFractionDigits?: number;
};

export function angka(value: number, options: AngkaOptions = {}): string {
  if (!Number.isFinite(value)) return "0";
  const minFractionDigits = options.minFractionDigits ?? 0;
  const maxFractionDigits = Math.max(minFractionDigits, options.maxFractionDigits ?? 3);
  const normalized = Object.is(value, -0) ? 0 : value;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(normalized);
}

export function meter(value: number, options: AngkaOptions = {}): string {
  return `${angka(value, options)} m`;
}

function toValidDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function tanggalWib(value: Date | string | number): string {
  const date = toValidDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function tanggalJamWib(value: Date | string | number): string {
  const date = toValidDate(value);
  if (!date) return "-";
  const datePart = tanggalWib(date);
  const timePart = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart}, ${timePart} WIB`;
}

// Indonesian number format: dot for thousands groups (1.500.000), comma for decimal (14,5).
const ID_GROUPED_INT = /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/;
const ID_PLAIN_NUM = /^-?\d+(?:,\d+)?$/;

export function parseAngkaId(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/^(-?)\s*rp\.?\s*/i, "$1")
    .replace(/\s*m$/i, "")
    .trim();

  if (!cleaned) return null;

  const isGrouped = cleaned.includes(".");
  if (isGrouped ? !ID_GROUPED_INT.test(cleaned) : !ID_PLAIN_NUM.test(cleaned)) {
    return null;
  }

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
