import "server-only";
import { db } from "@/lib/db";
import { tierFor, conThieuLenHang } from "@/lib/tiers";
import { getSettings } from "@/server/settings";
import { TINH_DA_BAN } from "@/lib/order-status";

/**
 * Hạng của chính khách, để hiện ngoài trang tài khoản.
 *
 * Đếm **cùng một luật với màn Khách hàng bên quản trị**: cùng danh sách trạng
 * thái, cùng mốc 12 tháng, cùng ngưỡng đọc từ cài đặt. Hai chỗ lệch nhau là
 * khách nhìn thấy "VÀNG" còn nhân viên nhìn thấy "BẠC", rồi cãi nhau ở quầy.
 */
export async function hangCuaToi(userId: string) {
  const tu = new Date();
  tu.setMonth(tu.getMonth() - 12);

  const [gom, caiDat] = await Promise.all([
    db.order.groupBy({
      by: ["userId"],
      where: { userId, status: { in: [...TINH_DA_BAN] }, createdAt: { gte: tu } },
      _sum: { total: true },
    }),
    getSettings(),
  ]);

  const nguong = {
    tierSilver: caiDat.tierSilver,
    tierGold: caiDat.tierGold,
    tierDiamond: caiDat.tierDiamond,
  };
  const chiTieu = gom[0]?._sum.total ?? 0;

  return { chiTieu, hang: tierFor(chiTieu, nguong), tiep: conThieuLenHang(chiTieu, nguong) };
}
