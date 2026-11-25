import { describe, expect, it } from "vitest";
import { angka, meter, parseAngkaId, rupiah, tanggalJamWib, tanggalWib } from "@/lib/format";

describe("lib/format", () => {
  it("memformat rupiah dengan titik ribuan dan pembulatan", () => {
    expect(rupiah(1500000)).toBe("Rp1.500.000");
    expect(rupiah(0)).toBe("Rp0");
    expect(rupiah(1500000.6)).toBe("Rp1.500.001");
    expect(rupiah(1500000.4)).toBe("Rp1.500.000");
    expect(rupiah(-250000)).toBe("-Rp250.000");
  });

  it("memformat angka dan meter memakai desimal koma dan titik ribuan", () => {
    expect(angka(14.5)).toBe("14,5");
    expect(angka(1250.75)).toBe("1.250,75");
    expect(angka(10)).toBe("10");
    expect(meter(14.5)).toBe("14,5 m");
    expect(meter(4, { minFractionDigits: 1 })).toBe("4,0 m");
    expect(meter(1234.5678)).toBe("1.234,568 m");
  });

  it("memformat tanggal dan jam dalam zona waktu WIB (Asia/Jakarta)", () => {
    const utcSample = "2026-11-26T07:30:00.000Z"; // 14:30 WIB
    expect(tanggalWib(utcSample)).toContain("26");
    expect(tanggalWib(utcSample)).toContain("2026");

    const withTime = tanggalJamWib(utcSample);
    expect(withTime).toContain("14");
    expect(withTime).toContain("30");
    expect(withTime.endsWith("WIB")).toBe(true);
    expect(tanggalWib("tidak-valid")).toBe("-");
  });

  it("mem-parse angka format Indonesia dengan benar dan menolak format rusak", () => {
    expect(parseAngkaId("1.500.000")).toBe(1500000);
    expect(parseAngkaId("Rp1.500.000")).toBe(1500000);
    expect(parseAngkaId("14,5")).toBe(14.5);
    expect(parseAngkaId("14,5 m")).toBe(14.5);
    expect(parseAngkaId("1.250,75")).toBe(1250.75);
    expect(parseAngkaId("-2,5")).toBe(-2.5);

    expect(parseAngkaId("")).toBeNull();
    expect(parseAngkaId("abc")).toBeNull();
    expect(parseAngkaId("1,2,3")).toBeNull();
    expect(parseAngkaId("1.23")).toBeNull();
  });
});
