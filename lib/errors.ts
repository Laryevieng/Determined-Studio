import { ERROR_MESSAGES } from "@/lib/messages";

export type AppErrorCode = keyof typeof ERROR_MESSAGES;

export type MappedError = {
  code: AppErrorCode;
  message: string;
  detail?: unknown;
};

// Sort longest keys first so specific prefixed codes (e.g. INVALID_ITEM:SIZE_NOTE) match before shorter ones (INVALID_ITEM:SIZE, INVALID_ITEM).
const SORTED_ERROR_CODES = (Object.keys(ERROR_MESSAGES) as AppErrorCode[])
  .filter((code) => code !== "UNKNOWN" && code !== "VALIDATION")
  .sort((a, b) => b.length - a.length);

function matchErrorCode(raw: string): AppErrorCode | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed === "VALIDATION") return "VALIDATION";

  for (const code of SORTED_ERROR_CODES) {
    if (trimmed === code) return code;
    if (trimmed.startsWith(`${code}:`) || trimmed.startsWith(`${code} `)) {
      return code;
    }
  }

  return null;
}

function formatMaterialHoldMessage(detail: unknown): string {
  if (detail && typeof detail === "object" && "eta" in detail) {
    const eta = (detail as { eta?: unknown }).eta;
    if (typeof eta === "string" && eta.trim().length > 0) {
      return `Pesanan menunggu bahan (perkiraan: ${eta.trim()}). Pemotongan belum dapat dimulai.`;
    }
  }
  return ERROR_MESSAGES.MATERIAL_HOLD;
}

export function mapDbError(
  messageOrCode: string | null | undefined,
  detail?: unknown,
): MappedError {
  const matched = typeof messageOrCode === "string" ? matchErrorCode(messageOrCode) : null;

  if (!matched) {
    return detail === undefined
      ? { code: "UNKNOWN", message: ERROR_MESSAGES.UNKNOWN }
      : { code: "UNKNOWN", message: ERROR_MESSAGES.UNKNOWN, detail };
  }

  const message =
    matched === "MATERIAL_HOLD" ? formatMaterialHoldMessage(detail) : ERROR_MESSAGES[matched];

  return detail === undefined ? { code: matched, message } : { code: matched, message, detail };
}
