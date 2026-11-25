import { describe, expect, it } from "vitest";
import { mapDbError, type AppErrorCode } from "@/lib/errors";
import { ERROR_MESSAGES } from "@/lib/messages";

const APPENDIX_A_CODES: AppErrorCode[] = [
  "FORBIDDEN",
  "ORDER_NOT_FOUND",
  "INVALID_TRANSITION",
  "ORDER_ON_HOLD",
  "VERSION_CONFLICT",
  "REVISION_LOCKED",
  "EMPTY_ORDER",
  "INVALID_ITEM:PRODUCT",
  "INVALID_ITEM:SIZE",
  "INVALID_ITEM:SIZE_NOTE",
  "INVALID_ITEM:PERSONALIZATION",
  "INVALID_ITEM:FABRIC",
  "INVALID_ITEM:TOO_MANY",
  "INVALID_ITEM",
  "INVALID_DEADLINE",
  "INVALID_PRICE",
  "CUSTOMER_NOT_FOUND",
  "SUMMARY_REQUIRED",
  "REASON_REQUIRED",
  "REASON_AND_ETA_REQUIRED",
  "ALREADY_PENDING",
  "ALREADY_DECIDED",
  "APPROVAL_NOT_FOUND",
  "USE_START_CUTTING",
  "USE_DEDICATED_FUNCTION",
  "INVALID_QUANTITY",
  "MATERIAL_NOT_FOUND",
  "ORDER_REQUIRED",
  "INVALID_PACKAGE",
  "INVALID_AMOUNT",
  "PAYMENT_NOT_FOUND",
  "FORFEIT_NOT_ALLOWED",
  "LAST_OWNER",
  "CANNOT_DEACTIVATE_SELF",
  "STOCK_SHORTAGE",
  "CONSUMPTION_RULE_MISSING",
  "PRICE_MISSING",
  "MATERIAL_HOLD",
  "USAGE_REQUIRED",
  "USAGE_MISSING",
  "USAGE_NOT_RESERVED",
  "REMNANT_REQUIRED",
  "REMNANT_EXCEEDS_USAGE",
  "STOCK_PHYSICAL_SHORT",
  "NEGATIVE_STOCK",
  "REMNANT_INSUFFICIENT",
  "PACKING_MISMATCH",
  "SECOND_CHECKER_REQUIRED",
  "PAYMENT_NOT_SETTLED",
];

describe("lib/errors dan lib/messages (Lampiran A)", () => {
  it("memetakan seluruh 49 kode Lampiran A ke pesan Bahasa Indonesia yang tidak kosong", () => {
    expect(APPENDIX_A_CODES).toHaveLength(49);
    for (const code of APPENDIX_A_CODES) {
      const mapped = mapDbError(code);
      expect(mapped.code).toBe(code);
      expect(mapped.message).toBe(ERROR_MESSAGES[code]);
      expect(mapped.message.trim().length).toBeGreaterThan(0);
    }
  });

  it("mengenali exception Postgres berakhiran detail dan menjaga urutan prefix spesifik", () => {
    expect(mapDbError("INVALID_TRANSITION:draft -> cutting")).toEqual({
      code: "INVALID_TRANSITION",
      message: ERROR_MESSAGES.INVALID_TRANSITION,
    });
    expect(mapDbError("INVALID_ITEM:SIZE_NOTE").code).toBe("INVALID_ITEM:SIZE_NOTE");
    expect(mapDbError("INVALID_ITEM:SIZE").code).toBe("INVALID_ITEM:SIZE");
    expect(mapDbError("INVALID_ITEM:detail lain").code).toBe("INVALID_ITEM");
  });

  it("meneruskan detail bisnis dan menyisipkan ETA pada MATERIAL_HOLD", () => {
    const shortageDetail = { rows: [{ material: "CONTOH Kain", shortage: 4 }] };
    expect(mapDbError("STOCK_SHORTAGE", shortageDetail)).toEqual({
      code: "STOCK_SHORTAGE",
      message: ERROR_MESSAGES.STOCK_SHORTAGE,
      detail: shortageDetail,
    });

    const hold = mapDbError("MATERIAL_HOLD", { eta: "30 Nov 2026" });
    expect(hold.code).toBe("MATERIAL_HOLD");
    expect(hold.message).toContain("30 Nov 2026");
  });

  it("memetakan kode tidak dikenal ke UNKNOWN dengan pesan umum §8.4", () => {
    expect(mapDbError("SOME_RANDOM_PG_ERROR")).toEqual({
      code: "UNKNOWN",
      message: "Terjadi kesalahan. Coba lagi",
    });
    expect(mapDbError(undefined)).toEqual({
      code: "UNKNOWN",
      message: "Terjadi kesalahan. Coba lagi",
    });
  });
});
