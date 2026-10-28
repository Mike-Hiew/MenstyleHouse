import { describe, expect, it } from "vitest";
import { parseOrderCookie, signOrderCode, verifyOrderCode } from "@/server/order-access";

const KEY = "khoa-thu";

describe("cookie xem trang đặt hàng thành công", () => {
  it("chữ ký đúng mã thì qua, sai mã hoặc sai khoá thì không", () => {
    const sig = signOrderCode("MSH-2026-00148", KEY);
    expect(verifyOrderCode("MSH-2026-00148", sig, KEY)).toBe(true);
    expect(verifyOrderCode("MSH-2026-00149", sig, KEY)).toBe(false);
    expect(verifyOrderCode("MSH-2026-00148", sig, "khoa-khac")).toBe(false);
    expect(verifyOrderCode("MSH-2026-00148", "", KEY)).toBe(false);
  });

  it("đọc cookie nhiều mã, bỏ phần hỏng, giữ tối đa 5", () => {
    const raw = ["A.x", "hong", "B.y", "C.z", "D.w", "E.v", "F.u"].join("|");
    expect(parseOrderCookie(raw).map((x) => x.code)).toEqual(["A", "B", "C", "D", "E"]);
    expect(parseOrderCookie("MSH-2026.00148.sig")).toEqual([{ code: "MSH-2026.00148", sig: "sig" }]);
    expect(parseOrderCookie(undefined)).toEqual([]);
  });
});
