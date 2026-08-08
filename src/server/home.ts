import "server-only";
import { db } from "@/lib/db";
import { cardInclude, type ProductCardData } from "@/server/catalog";
import { TINH_DA_BAN } from "@/lib/order-status";
import { formatVnd } from "@/lib/money";

/**
 * Dữ liệu cho các khối trang chủ.
 *
 * Trang chủ mockup có bảy khối; ba khối cuối (**bán chạy · khách nói gì · flash
 * sale**) trong mockup là chữ viết cứng. Ở đây chúng đọc dữ liệu thật, và
 * **khối nào không có dữ liệu thì biến mất** thay vì hiện số 0 hay mã giảm giá
 * không dùng được. Trang chủ là chỗ khách tin nhất; một mã sale gõ vào không ăn
 * còn tệ hơn là không quảng cáo mã nào.
 */

const NGAY = 24 * 60 * 60 * 1000;

export type BanChay = { san_pham: ProductCardData; daBan: number };

/**
 * Bán chạy nhất trong `soNgay` ngày qua.
 *
 * Đếm theo `TINH_DA_BAN` — **cùng danh sách trạng thái với báo cáo doanh thu**.
 * Đếm cả đơn đã huỷ thì con số ngoài trang chủ sẽ to hơn con số trong báo cáo,
 * và không ai giải thích được vì sao.
 */
export async function getBestsellers(take = 4, soNgay = 30): Promise<BanChay[]> {
  const tu = new Date(Date.now() - soNgay * NGAY);

  const [dong, bien] = await Promise.all([
    db.orderItem.groupBy({
      by: ["variantId"],
      where: { order: { status: { in: [...TINH_DA_BAN] }, createdAt: { gte: tu } } },
      _sum: { qty: true },
    }),
    db.variant.findMany({ select: { id: true, productId: true } }),
  ]);

  const thuoc = new Map(bien.map((v) => [v.id, v.productId]));
  const daBan = new Map<string, number>();
  for (const d of dong) {
    const pid = thuoc.get(d.variantId);
    if (!pid) continue;
    daBan.set(pid, (daBan.get(pid) ?? 0) + (d._sum.qty ?? 0));
  }

  const xep = [...daBan.entries()].sort((a, b) => b[1] - a[1]);
  if (xep.length === 0) return [];

  // Lấy dư rồi cắt: sản phẩm có thể đã ẩn hoặc bị xoá sau khi bán.
  const found = await db.product.findMany({
    where: { id: { in: xep.slice(0, take * 3).map(([id]) => id) }, status: "ACTIVE" },
    include: cardInclude,
  });
  const theoId = new Map(found.map((p) => [p.id, p]));

  return xep
    .map(([id, n]) => {
      const p = theoId.get(id);
      return p ? { san_pham: p, daBan: n } : null;
    })
    .filter((x): x is BanChay => x !== null)
    .slice(0, take);
}

export type LoiKhach = {
  id: string;
  sao: number;
  noiDung: string;
  ten: string;
  moTa: string;
};

/**
 * Đánh giá đem lên trang chủ.
 *
 * Chỉ lấy đánh giá **đã duyệt** và từ 4 sao trở lên. Đây là khối quảng cáo, và
 * đã có màn duyệt đánh giá riêng ở admin — không có chuyện một lời chê lọt lên
 * trang chủ chỉ vì nó mới nhất.
 *
 * Lời quá ngắn ("ok", "đẹp") bị loại: chúng chiếm chỗ mà không nói được gì.
 */
export async function getHomeReviews(take = 3): Promise<LoiKhach[]> {
  const rows = await db.review.findMany({
    where: { approved: true, rating: { gte: 4 }, body: { not: "" } },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: take * 4,
    select: {
      id: true,
      rating: true,
      body: true,
      authorName: true,
      createdAt: true,
      product: { select: { name: true } },
    },
  });

  return rows
    .filter((r) => r.body.trim().length >= 30)
    .slice(0, take)
    .map((r) => ({
      id: r.id,
      sao: r.rating,
      noiDung: r.body.trim(),
      ten: r.authorName,
      moTa: `Đã mua ${r.product.name}`,
    }));
}

export type FlashSale = {
  code: string;
  tieuDe: string;
  phu: string;
  conLai: number | null;
};

/**
 * Mã giảm giá đang chạy để dựng băng-rôn đầu trang.
 *
 * Lấy mã **sắp hết hạn nhất** trong số đang chạy: đó là mã gấp nhất, và cũng là
 * mã sẽ biến mất khỏi trang chủ sớm nhất mà không cần ai đi tắt tay.
 *
 * Bỏ `memberOnly` — băng-rôn này khách vãng lai cũng nhìn thấy, quảng cáo một
 * mã họ không dùng được là mời người ta gõ vào rồi bị từ chối ở bước cuối.
 */
export async function getFlashSale(): Promise<FlashSale | null> {
  const now = new Date();
  const rows = await db.coupon.findMany({
    where: {
      active: true,
      memberOnly: false,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { endsAt: "asc" },
    take: 5,
  });

  // Mã đã dùng hết lượt vẫn còn `active`; lọc ở đây chứ không lọc trong SQL vì
  // Prisma không so được hai cột với nhau.
  const con = rows.find((c) => c.usageLimit === null || c.usedCount < c.usageLimit);
  if (!con) return null;

  const tieuDe =
    con.type === "PERCENT"
      ? `Giảm ${con.value}% toàn bộ đơn`
      : con.type === "FIXED"
        ? `Giảm ${formatVnd(con.value)} cho đơn hàng`
        : "Miễn phí giao hàng";

  const phu =
    con.minSubtotal > 0 ? `cho đơn từ ${formatVnd(con.minSubtotal)}` : "không cần đơn tối thiểu";

  return {
    code: con.code,
    tieuDe,
    phu,
    conLai: con.usageLimit === null ? null : con.usageLimit - con.usedCount,
  };
}
