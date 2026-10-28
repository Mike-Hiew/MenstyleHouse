import type { Metadata } from "next";
import { SettingsThanhToan } from "@/components/admin/settings-thanh-toan";
import { QrUpload } from "@/components/admin/qr-upload";
import { requirePermission } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cài đặt — Thanh toán" };

/** Chốt quyền tại trang — layout không phải lớp bảo vệ, xem `cai-dat/page.tsx`. */
export default async function CaiDatThanhToanPage() {
  await requirePermission("cai-dat.quan-ly");
  const s = await getSettings();

  return (
    <div>
      <SettingsThanhToan
        data={{
          bankName: s.bankName,
          bankAccount: s.bankAccount,
          bankOwner: s.bankOwner,
          payCod: s.payCod,
          payBank: s.payBank,
        }}
      />

      {/*
        Khối QR đứng riêng, **ngoài** form cài đặt: nó là form upload file, gộp
        chung thì mỗi lần sửa một con số cũng phải gửi lại cả tấm ảnh.
      */}
      <section className="mt-10 max-w-[560px] border-t-2 border-divider pt-3.5">
        <h2 className="mb-3.5 text-[19px]">Ảnh QR chuyển khoản</h2>
        <QrUpload qrUrl={s.qrUrl} />
      </section>
    </div>
  );
}
