import Link from "next/link";
import { NewCustomerForm } from "@/components/admin/new-customer-form";
import { requirePermission } from "@/server/admin/guard";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requirePermission("khach-hang.tao");

  return (
    <div>
      <Link
        href="/admin/khach-hang"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI KHÁCH HÀNG
      </Link>

      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Thêm khách hàng</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Dành cho khách mua tại cửa hàng muốn có tài khoản để tích điểm.
        </p>
      </div>

      <NewCustomerForm />
    </div>
  );
}
