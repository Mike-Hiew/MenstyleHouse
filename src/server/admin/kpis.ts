import "server-only";
import { db } from "@/lib/db";
import { TINH_DA_BAN } from "@/lib/order-status";
import { phanHoiDauMs, quaHan, trungBinh, tyLeMuaLai } from "@/lib/kpi";
import { formatVnd } from "@/lib/money";
import { getSettings } from "@/server/settings";
import { deltaPercent } from "./dashboard";

/**
 * Thẻ số liệu đầu màn Khách hàng và Hỗ trợ.
 *
 * Kỳ so sánh là 30 ngày gần nhất với 30 ngày liền trước, giống trang Tổng
 * quan. Đơn tính chi tiêu dùng đúng danh sách `TINH_DA_BAN` của báo cáo doanh
 * thu — hai chỗ đếm lệch nhau là hai con số cãi nhau.
 */

export type Kpi = {
  label: string;
  value: number;
  kind: "number" | "money" | "percent" | "duration";
  /** % so với kỳ trước. `null`: kỳ trước bằng 0, không so được. Bỏ trống: không so. */
  delta?: number | null;
  /** Giảm mới là tốt (thời gian phản hồi). */
  lowerIsBetter?: boolean;
  /** Tăng hay giảm đều không tốt không xấu (số yêu cầu gửi tới). */
  neutral?: boolean;
  /** Dòng phụ thay cho phần so sánh. */
  note?: string;
  /** Tô đỏ dòng phụ: có việc đang trễ. */
  alert?: boolean;
};

const NGAY = 86_400_000;

function moc(days: number) {
  const since = new Date(Date.now() - days * NGAY);
  return { since, prevSince: new Date(since.getTime() - days * NGAY) };
}

/** Chi tiêu trung bình của mỗi khách có tài khoản đã mua trong khoảng. */
async function chiTieuTb(from: Date, to?: Date) {
  const nhom = await db.order.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      user: { role: "CUSTOMER" },
      status: { in: [...TINH_DA_BAN] },
      createdAt: to ? { gte: from, lt: to } : { gte: from },
    },
    _sum: { total: true },
  });
  if (nhom.length === 0) return 0;
  return Math.round(nhom.reduce((s, g) => s + (g._sum.total ?? 0), 0) / nhom.length);
}

export async function loadCustomerKpis(days = 30): Promise<Kpi[]> {
  const { since, prevSince } = moc(days);
  const motNam = new Date(Date.now() - 365 * NGAY);

  const [moi, moiTruoc, donTheoKhach, tb, tbTruoc, diem, caiDat] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevSince, lt: since } } }),
    // 12 tháng: cùng khung với chi tiêu và phân hạng ở bảng bên dưới.
    db.order.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        user: { role: "CUSTOMER" },
        status: { in: [...TINH_DA_BAN] },
        createdAt: { gte: motNam },
      },
      _count: { _all: true },
    }),
    chiTieuTb(since),
    chiTieuTb(prevSince, since),
    db.user.aggregate({ where: { role: "CUSTOMER" }, _sum: { pointBalance: true } }),
    getSettings(),
  ]);

  const muaLai = tyLeMuaLai(donTheoKhach.map((g) => g._count._all));
  const tongDiem = diem._sum.pointBalance ?? 0;

  return [
    { label: `KHÁCH MỚI ${days} NGÀY`, value: moi, kind: "number", delta: deltaPercent(moi, moiTruoc) },
    {
      label: "TỶ LỆ MUA LẠI",
      value: muaLai.phanTram,
      kind: "percent",
      note: `${muaLai.muaLai}/${muaLai.daMua} khách có từ 2 đơn · 12 tháng`,
    },
    { label: "CHI TIÊU TB / KHÁCH", value: tb, kind: "money", delta: deltaPercent(tb, tbTruoc) },
    {
      label: "ĐIỂM ĐANG LƯU HÀNH",
      value: tongDiem,
      kind: "number",
      // Quy ra tiền theo giá trị điểm trong Cài đặt: đây là khoản cửa hàng đang nợ khách.
      note: caiDat.redeemEnabled
        ? `≈ ${formatVnd(tongDiem * caiDat.pointValue)} nếu đổi hết`
        : "Đang tắt đổi điểm",
    },
  ];
}

export async function loadSupportKpis(days = 30): Promise<Kpi[]> {
  const { since, prevSince } = moc(days);
  const now = new Date();
  const tin = { select: { isStaff: true, createdAt: true } } as const;

  const [dangMo, gan] = await Promise.all([
    db.ticket.findMany({
      where: { status: { in: ["OPEN", "PENDING"] } },
      select: { createdAt: true, messages: tin },
    }),
    db.ticket.findMany({
      where: { createdAt: { gte: prevSince } },
      select: { createdAt: true, status: true, messages: tin },
    }),
  ]);

  const kyNay = gan.filter((t) => t.createdAt >= since);
  const kyTruoc = gan.filter((t) => t.createdAt < since);
  const soQuaHan = dangMo.filter((t) => quaHan(t, now)).length;
  const phanHoi = trungBinh(kyNay.map(phanHoiDauMs));
  const phanHoiTruoc = trungBinh(kyTruoc.map(phanHoiDauMs));
  const xong = kyNay.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  return [
    {
      label: "ĐANG MỞ",
      value: dangMo.length,
      kind: "number",
      note: soQuaHan > 0 ? `${soQuaHan} quá hạn 4 giờ` : "Không có yêu cầu quá hạn",
      alert: soQuaHan > 0,
    },
    {
      label: "PHẢN HỒI ĐẦU TB",
      value: phanHoi,
      kind: "duration",
      delta: phanHoi && phanHoiTruoc ? deltaPercent(phanHoi, phanHoiTruoc) : null,
      lowerIsBetter: true,
    },
    {
      label: `YÊU CẦU MỚI ${days} NGÀY`,
      value: kyNay.length,
      kind: "number",
      delta: deltaPercent(kyNay.length, kyTruoc.length),
      neutral: true,
    },
    {
      label: "ĐÃ TRẢ LỜI / ĐÓNG",
      value: kyNay.length ? Math.round((xong / kyNay.length) * 100) : 0,
      kind: "percent",
      note: `${xong}/${kyNay.length} yêu cầu trong ${days} ngày`,
    },
  ];
}
