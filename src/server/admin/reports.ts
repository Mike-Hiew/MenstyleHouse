import "server-only";
import { db } from "@/lib/db";
import { TINH_DA_BAN } from "@/lib/order-status";
import { soThangCua, type Khoang } from "@/lib/ky-bao-cao";

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
export async function doanhThuTheoThang(k: Khoang): Promise<KyBaoCao[]> {
  const soThang = soThangCua(k);
  const tu = new Date(k.tu);
  tu.setHours(0, 0, 0, 0);

  const orders = await db.order.findMany({
    where: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: k.tu, lte: k.den } },
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
export async function tongQuanBaoCao(k: Khoang): Promise<TongQuan> {

  const [tinh, huy] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: k.tu, lte: k.den } },
      _sum: { total: true, discount: true },
      _count: { _all: true },
    }),
    db.order.count({ where: { status: "CANCELLED", createdAt: { gte: k.tu, lte: k.den } } }),
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

export type LaiGop = {
  doanhThu: number;
  giaVon: number;
  laiGop: number;
  /** Phần trăm lãi trên doanh thu; 0 khi chưa bán được gì. */
  bienLai: number;
  /** Số dòng hàng bán ra mà **chưa từng nhập** nên không biết giá vốn. */
  thieuGiaVon: number;
};

/**
 * Lãi gộp = doanh thu − giá vốn hàng bán.
 *
 * Giá vốn từng biến thể là **bình quân gia quyền của mọi phiếu nhập đã ghi sổ**
 * — cách đơn giản nhất mà vẫn đúng khi giá nhập đổi giữa các lô. Không dùng giá
 * nhập gần nhất: một lô nhỏ mua đắt sẽ kéo lệch cả tháng.
 *
 * Hàng bán ra mà chưa từng nhập qua hệ thống (dữ liệu mẫu, hoặc tồn đầu kỳ nhập
 * tay) thì **không đoán giá vốn** — đếm riêng vào `thieuGiaVon` và báo lên màn
 * hình. Đoán bừa là ra một con số lãi trông có vẻ đúng mà không ai kiểm được.
 */
export async function laiGop(k: Khoang): Promise<LaiGop> {

  const dong = await db.orderItem.findMany({
    where: { order: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: k.tu, lte: k.den } } },
    select: { variantId: true, qty: true, lineTotal: true },
  });
  if (dong.length === 0) {
    return { doanhThu: 0, giaVon: 0, laiGop: 0, bienLai: 0, thieuGiaVon: 0 };
  }

  const nhap = await db.goodsReceiptLine.groupBy({
    by: ["variantId"],
    where: {
      variantId: { in: [...new Set(dong.map((d) => d.variantId))] },
      receipt: { status: "POSTED" },
    },
    _sum: { qty: true, lineTotal: true },
  });

  const vonMoiCai = new Map<string, number>();
  for (const n of nhap) {
    const sl = n._sum.qty ?? 0;
    if (sl > 0) vonMoiCai.set(n.variantId, Math.round((n._sum.lineTotal ?? 0) / sl));
  }

  let doanhThu = 0;
  let giaVon = 0;
  let thieuGiaVon = 0;
  for (const d of dong) {
    doanhThu += d.lineTotal;
    const von = vonMoiCai.get(d.variantId);
    if (von === undefined) thieuGiaVon += 1;
    else giaVon += von * d.qty;
  }

  const lai = doanhThu - giaVon;
  return {
    doanhThu,
    giaVon,
    laiGop: lai,
    bienLai: doanhThu > 0 ? Math.round((lai / doanhThu) * 1000) / 10 : 0,
    thieuGiaVon,
  };
}
