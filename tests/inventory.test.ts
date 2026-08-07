import { describe, expect, it } from "vitest";
import { auditStock } from "../src/lib/inventory";

/**
 * Bất biến tồn kho — bắt buộc chạy trong CI từ M4.
 * Với mọi variant: stock === Σ(movements.delta)
 */
describe("bất biến tồn kho", () => {
  it("stock khớp tổng sổ cái ở mọi SKU", async () => {
    const drift = await auditStock();
    expect(drift, "SKU lệch sổ: " + drift.map((d) => d.sku).join(", ")).toEqual([]);
  });
});
