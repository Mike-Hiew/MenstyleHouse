import type { Metadata } from "next";
import { requirePermission } from "@/server/admin/guard";
import { listWarehouses } from "@/server/admin/warehouses";
import { WarehouseManager } from "@/components/admin/warehouse-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Danh mục kho" };

/**
 * Danh mục kho.
 *
 * `kho.ghi-so` chứ không phải `kho.xem`: mở và đóng kho là việc một chiều, cùng
 * nhóm với ghi sổ phiếu nhập. Kế toán xem được tồn nhưng không đụng vào đây.
 */
export default async function AdminWarehousesPage() {
  await requirePermission("kho.ghi-so");
  const khos = await listWarehouses();

  return (
    <div>
      <div className="mb-6 border-b-2 border-border-soft pb-3.5">
        <h1 className="text-[26px] lg:text-[34px]">Danh mục kho</h1>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Nơi hàng thật sự nằm. Phiếu nhập ghi vào một kho cụ thể, còn đơn bán trừ từ kho chính
          nếu không chỉ định.
        </p>
      </div>

      <WarehouseManager khos={khos} />
    </div>
  );
}
