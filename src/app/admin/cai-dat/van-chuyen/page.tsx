import type { Metadata } from "next";
import { SettingsVanChuyen } from "@/components/admin/settings-van-chuyen";
import { requirePermission } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cài đặt — Vận chuyển & thuế" };

/** Chốt quyền tại trang — layout không phải lớp bảo vệ, xem `cai-dat/page.tsx`. */
export default async function CaiDatVanChuyenPage() {
  await requirePermission("cai-dat.quan-ly");
  const s = await getSettings();

  return (
    <SettingsVanChuyen
      data={{
        shipInnerCity: s.shipInnerCity,
        shipProvince: s.shipProvince,
        freeShipFrom: s.freeShipFrom,
        vatRate: s.vatRate,
        holdMinutes: s.holdMinutes,
      }}
    />
  );
}
