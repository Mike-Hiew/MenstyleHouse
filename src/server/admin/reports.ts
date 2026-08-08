import "server-only";
import { db } from "@/lib/db";
import { TINH_DA_BAN } from "@/lib/order-status";

/**
 * Báo cáo doanh thu.
 *
 * Ba quyết định đứng sau mọi con số ở đây:
 *
 * 1. **Đơn huỷ và đơn trả hàng không tính.** Chúng đã được hoàn tồn, hoàn điểm
 *    và trả lượt mã giảm giá; tính vào doanh thu là đếm tiền chưa bao giờ về.
 * 2. **Mốc thời gian là lúc đặt đơn** (`createdAt`), không phải lúc giao xong.
 *    Đơn đặt cuối tháng 7 giao đầu tháng 8 vẫn thuộc tháng 7 — khớp với cách
 *    cửa hàng nhìn "tháng này bán được bao nhiêu".
 * 3. **Tiền là `Int` đồng.** Giá trị đơn hàng trung bình chia rồi làm tròn về
 *    số nguyên; không có chỗ nào để lọt một số thực vào tiền.
 */

export type KyBaoCao = { thang: number; nam: number; doanhThu: number; soDon: number; gtdh: number };

/**
 * Doanh thu theo tháng, mới nhất trước.
 *
 * Gom trong JS chứ không `groupBy` theo tháng: Prisma không nhóm được theo hàm
 * `date_trunc`, và viết `$queryRaw` cho việc này thì đổi múi giờ là sai âm
 * thầm. Số đơn ở quy mô cửa hàng này còn nhỏ, đọc hết rồi gom là đủ nhanh.
 */
export async function doanhThuTheoThang(soThang = 12): Promise<KyBaoCao[]> {
  const tu = new Date();
  tu.setMonth(tu.getMonth() - (soThang - 1), 1);
  tu.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: tu } },
    select: { total: true, createdAt: true },
  });

  const theoKy = new Map<string, { doanhThu: number; soDon: number }>();
  for (const o of orders) {
    const key = o.createdAt.getFullYear() + "-" + o.createdAt.getMonth();
    const cu = theoKy.get(key) ?? { doanhThu: 0, soDon: 0 };
    theoKy.set(key, { doanhThu: cu.doanhThu + o.total, soDon: cu.soDon + 1 });
  }

  const ra: KyBaoCao[] = [];
  for (let i = 0; i < soThang; i++) {
    const d = new Date(tu.getFullYear(), tu.getMonth() + i, 1);
    const v = theoKy.get(d.getFullYear() + "-" + d.getMonth()) ?? { doanhThu: 0, soDon: 0 };
    ra.push({
      thang: d.getMonth() + 1,
      nam: d.getFullYear(),
      doanhThu: v.doanhThu,
      soDon: v.soDon,
      gtdh: v.soDon === 0 ? 0 : Math.round(v.doanhThu / v.soDon),
    });
  }

  return ra.reverse();
}

export type TopSanPham = { sku: string; ten: string; soLuong: number; doanhThu: number };

/** Bán chạy nhất theo doanh thu, lấy từ dòng đơn đã snapshot giá lúc mua. */
export async function topSanPham(limit = 10): Promise<TopSanPham[]> {
  const gom = await db.orderItem.groupBy({
    by: ["sku", "productName"],
    where: { order: { status: { in: [...TINH_DA_BAN] } } },
    _sum: { qty: true, lineTotal: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });

  return gom.map((g) => ({
    sku: g.sku,
    ten: g.productName,
    soLuong: g._sum.qty ?? 0,
    doanhThu: g._sum.lineTotal ?? 0,
  }));
}

export type TongQuan = {
  doanhThu: number;
  soDon: number;
  gtdh: number;
  soDonHuy: number;
  tienGiamGia: number;
};

/** Số tổng của cả kỳ đang xem, để đặt trên đầu bảng. */
export async function tongQuanBaoCao(soThang = 12): Promise<TongQuan> {
  const tu = new Date();
  tu.setMonth(tu.getMonth() - (soThang - 1), 1);
  tu.setHours(0, 0, 0, 0);

  const [tinh, huy] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: tu } },
      _sum: { total: true, discount: true },
      _count: { _all: true },
    }),
    db.order.count({ where: { status: "CANCELLED", createdAt: { gte: tu } } }),
  ]);

  const doanhThu = tinh._sum.total ?? 0;
  const soDon = tinh._count._all;

  return {
    doanhThu,
    soDon,
    gtdh: soDon === 0 ? 0 : Math.round(doanhThu / soDon),
    soDonHuy: huy,
    tienGiamGia: tinh._sum.discount ?? 0,
  };
}
