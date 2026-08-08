import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponForm } from "@/components/admin/coupon-form";
import { requirePermission } from "@/server/admin/guard";
import { getCoupon } from "@/server/admin/coupons";

export const dynamic = "force-dynamic";

/** `<input type="datetime-local">` chỉ nhận `YYYY-MM-DDTHH:mm` theo giờ máy. */
function choOInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("khuyen-mai.quan-ly");

  const { id } = await params;
  const c = await getCoupon(id);
  if (!c) notFound();

  return (
    <div>
      <Link
        href="/admin/khuyen-mai"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI KHUYẾN MÃI
      </Link>

      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="font-mono text-[26px] font-bold lg:text-[34px]">{c.code}</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Đã dùng {c.usedCount} lần
          {c.usageLimit ? ` trên ${c.usageLimit} lượt` : ""}
        </p>
      </div>

      <CouponForm
        coupon={{
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          minSubtotal: c.minSubtotal,
          maxDiscount: c.maxDiscount,
          usageLimit: c.usageLimit,
          perUserLimit: c.perUserLimit,
          memberOnly: c.memberOnly,
          startsAt: choOInput(c.startsAt),
          endsAt: choOInput(c.endsAt),
          active: c.active,
          usedCount: c.usedCount,
        }}
      />
    </div>
  );
}
