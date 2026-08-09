import { describe, expect, it } from "vitest";
import { auditStock, auditWarehouse } from "../src/lib/inventory";

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

describe("tồn kho theo từng kho", () => {
  it("tổng tồn mọi kho luôn bằng Variant.stock", async () => {
    /*
     * Bất biến thứ hai, khác `stock === Σ(movements.delta)`: sổ lệch là ai đó
     * ghi thẳng vào `stock`, còn tổng kho lệch là một lối gọi `moveStock` nào
     * đó quên cập nhật `StockLevel`.
     */
    const lech = await auditWarehouse();
    expect(lech.map((r) => r.sku + ": tồn " + r.stock + " ≠ theo kho " + r.theoKho)).toEqual([]);
  });
});
