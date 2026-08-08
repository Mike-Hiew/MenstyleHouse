import "server-only";
import { db } from "@/lib/db";

/**
 * Số liệu tổng quan. Doanh thu chỉ tính đơn **không huỷ** — đơn CANCELLED và
 * RETURNED không phải doanh thu.
 */

const EARNING = ["PENDING", "CONFIRMED", "PACKING", "SHIPPING", "DELIVERED"] as const;

function monthStart(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - offset);
  return d;
}

export async function loadDashboard(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const prevSince = new Date(since.getTime() - days * 86_400_000);

  const [now, prev, pending, lowStock, topRows, monthly] = await Promise.all([
    db.order.aggregate({
      where: { createdAt: { gte: since }, status: { in: [...EARNING] } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.order.aggregate({
      where: {
        createdAt: { gte: prevSince, lt: since },
        status: { in: [...EARNING] },
      },
      _sum: { total: true },
      _count: { _all: true },
    }),
    db.order.count({ where: { status: "PENDING" } }),
    db.variant.findMany({
      where: { stock: { lte: 10 } },
      orderBy: { stock: "asc" },
      take: 8,
      select: {
        id: true,
        sku: true,
        stock: true,
        lowStockAt: true,
        color: true,
        size: true,
        product: { select: { name: true, slug: true } },
      },
    }),
    db.orderItem.groupBy({
      by: ["productName"],
      _sum: { qty: true, lineTotal: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
    Promise.all(
      Array.from({ length: 6 }, (_, i) => 5 - i).map(async (offset) => {
        const from = monthStart(offset);
        const to = monthStart(offset - 1);
        const agg = await db.order.aggregate({
          where: { createdAt: { gte: from, lt: to }, status: { in: [...EARNING] } },
          _sum: { total: true },
        });
        return {
          label: (from.getMonth() + 1).toString().padStart(2, "0") + "/" + String(from.getFullYear()).slice(2),
          value: agg._sum.total ?? 0,
        };
      }),
    ),
  ]);

  const revenue = now._sum.total ?? 0;
  const prevRevenue = prev._sum.total ?? 0;
  const orders = now._count._all;
  const prevOrders = prev._count._all;

  return {
    days,
    kpis: [
      { label: "DOANH THU", value: revenue, prev: prevRevenue, money: true },
      { label: "SỐ ĐƠN", value: orders, prev: prevOrders, money: false },
      {
        label: "GIÁ TRỊ ĐƠN TB",
        value: orders ? Math.round(revenue / orders) : 0,
        prev: prevOrders ? Math.round(prevRevenue / prevOrders) : 0,
        money: true,
      },
      { label: "CHỜ XỬ LÝ", value: pending, prev: pending, money: false },
    ],
    monthly,
    top: topRows.map((r) => ({
      name: r.productName,
      qty: r._sum.qty ?? 0,
      revenue: r._sum.lineTotal ?? 0,
    })),
    lowStock,
  };
}

/** Phần trăm thay đổi so với kỳ trước; kỳ trước bằng 0 thì không so được. */
export function deltaPercent(value: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((value - prev) / prev) * 100);
}
