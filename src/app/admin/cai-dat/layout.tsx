import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { SettingsTabs } from "@/components/admin/settings-tabs";

export const metadata: Metadata = { title: { default: "Cài đặt", template: "%s" } };

/**
 * Khung chung cho khu Cài đặt: tiêu đề và thanh chuyển mục.
 *
 * Có gọi `requirePermission` ở đây, nhưng **từng trang con vẫn phải tự gọi** —
 * đây không phải chốt chặn. Next không chạy lại layout khi điều hướng giữa các
 * trang cùng nhánh, nên trang nào chỉ dựa vào layout là trang đó hở. Đúng lỗi đã
 * xảy ra ở M6.8 với tám trang quản trị, và `tests/permissions.test.ts` quét mã
 * nguồn để nó không tái diễn.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("cai-dat.quan-ly");

  return (
    <div>
      <div className="mb-5 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Cài đặt</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Thông tin cửa hàng, thanh toán, vận chuyển và chương trình khách thân thiết. Nhân sự và
          phân quyền nằm ở mục riêng trên thanh bên.
        </p>
      </div>

      <SettingsTabs />
      {children}
    </div>
  );
}
