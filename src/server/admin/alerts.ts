import "server-only";
import { db } from "@/lib/db";
import type { PermissionKey } from "@/lib/permissions";

/**
 * Việc đang chờ người xử lý — nội dung cho nút chuông ở khu quản trị.
 *
 * Trước M6.16 nút chuông **không có `onClick`** mà vẫn đeo chấm đỏ báo "có
 * thông báo mới". Một nút bấm không làm gì đã tệ; đeo thêm chấm đỏ là nói dối.
 *
 * Không dựng bảng thông báo riêng: mọi con số ở đây **đếm từ dữ liệu thật** nên
 * không bao giờ lệch với các màn tương ứng, và không cần ai đi đánh dấu đã đọc.
 *
 * Mỗi mục kèm khả năng cần có — người không có quyền xem đơn thì không thấy
 * mục đơn, đúng như sidebar.
 */
export type Viec = {
  key: string;
  nhan: string;
  so: number;
  href: string;
  can: PermissionKey;
};

export async function vieccanLam(): Promise<Viec[]> {
  const [choXacNhan, hoTroMo, sapHet, hetHang, nhapNhap] = await Promise.all([
    db.order.count({ where: { status: "PENDING" } }),
    db.ticket.count({ where: { status: { in: ["OPEN", "PENDING"] } } }),
    db.variant.count({ where: { stock: { gt: 0, lte: 10 } } }),
    db.variant.count({ where: { stock: { lte: 0 } } }),
    db.goodsReceipt.count({ where: { status: "DRAFT" } }),
  ]);

  const ds: Viec[] = [
    { key: "don", nhan: "đơn chờ xác nhận", so: choXacNhan, href: "/admin/don-hang?tab=cho", can: "don.xem" },
    { key: "ho-tro", nhan: "yêu cầu hỗ trợ chưa xong", so: hoTroMo, href: "/admin/ho-tro", can: "ho-tro.tra-loi" },
    { key: "het", nhan: "biến thể đã hết hàng", so: hetHang, href: "/admin/ton-kho?tab=het", can: "kho.xem" },
    { key: "sap-het", nhan: "biến thể sắp hết", so: sapHet, href: "/admin/ton-kho?tab=duoi-nguong", can: "kho.xem" },
    { key: "phieu", nhan: "phiếu nhập còn nháp", so: nhapNhap, href: "/admin/nhap-kho", can: "kho.ghi-so" },
  ];
  return ds.filter((v) => v.so > 0);
}
