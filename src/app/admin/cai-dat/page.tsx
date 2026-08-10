import { SettingsCuaHang } from "@/components/admin/settings-cua-hang";
import { requirePermission } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

/**
 * Chốt quyền **ngay tại trang**, dù `layout.tsx` cũng đã chốt.
 *
 * Layout không phải lớp bảo vệ: Next không chạy lại layout khi điều hướng giữa
 * các trang cùng nhánh. Đây đúng là lỗi đã xảy ra ở M6.8 với tám trang chỉ dựa
 * vào guard của layout — `tests/permissions.test.ts` quét mã nguồn để nó không
 * tái diễn.
 */
export default async function CaiDatCuaHangPage() {
  await requirePermission("cai-dat.quan-ly");
  const s = await getSettings();

  return (
    <SettingsCuaHang
      data={{
        shopName: s.shopName,
        taxCode: s.taxCode,
        address: s.address,
        hotline: s.hotline,
        email: s.email,
      }}
    />
  );
}
