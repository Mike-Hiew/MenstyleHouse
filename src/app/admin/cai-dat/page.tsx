import { SettingsForm } from "@/components/admin/settings-form";
import { StaffRoles } from "@/components/admin/staff-roles";
import { QrUpload } from "@/components/admin/qr-upload";
import { requirePermission } from "@/server/admin/guard";
import { getSettings } from "@/server/settings";
import { listInvites, listStaff } from "@/server/admin/staff";
import { getMatrix } from "@/server/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const me = await requirePermission("cai-dat.quan-ly");
  const [s, staff, invites, matrix] = await Promise.all([
    getSettings(),
    listStaff(),
    listInvites(),
    getMatrix(),
  ]);

  return (
    <div>
      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Cài đặt</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Thông tin cửa hàng, vận chuyển, thuế, phân hạng khách và phân quyền.
        </p>
      </div>

      <SettingsForm
        data={{
          shopName: s.shopName,
          taxCode: s.taxCode,
          address: s.address,
          hotline: s.hotline,
          email: s.email,
          bankName: s.bankName,
          bankAccount: s.bankAccount,
          bankOwner: s.bankOwner,
          shipInnerCity: s.shipInnerCity,
          shipProvince: s.shipProvince,
          freeShipFrom: s.freeShipFrom,
          vatRate: s.vatRate,
          holdMinutes: s.holdMinutes,
          tierSilver: s.tierSilver,
          tierGold: s.tierGold,
          tierDiamond: s.tierDiamond,
          payCod: s.payCod,
          payBank: s.payBank,
        }}
      />

      {/*
        Khối QR đứng riêng, **ngoài** form cài đặt: nó là form upload file, gộp
        chung thì mỗi lần sửa một con số cũng phải gửi lại cả tấm ảnh.
      */}
      <section className="mt-10 max-w-[640px] border-t-2 border-divider pt-3.5">
        <h2 className="mb-3.5 text-[19px]">Ảnh QR chuyển khoản</h2>
        <QrUpload qrUrl={s.qrUrl} />
      </section>

      <div className="mt-10">
        <StaffRoles
          members={staff.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            role: m.role,
            active: m.active,
            soHoaDon: m._count.invoicesIssued,
          }))}
          invites={invites}
          matrix={matrix}
          meId={me.id}
        />
      </div>
    </div>
  );
}
