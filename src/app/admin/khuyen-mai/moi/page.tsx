import Link from "next/link";
import { CouponForm } from "@/components/admin/coupon-form";
import { requirePermission } from "@/server/admin/guard";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  await requirePermission("khuyen-mai.quan-ly");

  return (
    <div>
      <Link
        href="/admin/khuyen-mai"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI KHUYẾN MÃI
      </Link>

      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Tạo mã giảm giá</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Điều kiện áp mã đều kiểm lại ở server lúc khách đặt đơn.
        </p>
      </div>

      <CouponForm coupon={null} />
    </div>
  );
}
