import type { Metadata } from "next";
import { SettingsThanThiet } from "@/components/admin/settings-than-thiet";
import { requirePermission } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cài đặt — Khách thân thiết" };

/** Chốt quyền tại trang — layout không phải lớp bảo vệ, xem `cai-dat/page.tsx`. */
export default async function CaiDatThanThietPage() {
  await requirePermission("cai-dat.quan-ly");
  const s = await getSettings();

  return (
    <SettingsThanThiet
      data={{
        redeemEnabled: s.redeemEnabled,
        pointValue: s.pointValue,
        redeemMaxPct: s.redeemMaxPct,
        tiersEnabled: s.tiersEnabled,
        tierSilver: s.tierSilver,
        tierGold: s.tierGold,
        tierDiamond: s.tierDiamond,
      }}
    />
  );
}
