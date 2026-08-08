import { NextResponse } from "next/server";
import { expireUnpaidOrders } from "@/server/payments";
import { getSettings } from "@/server/settings";

/**
 * Dọn đơn trả trước quá hạn. Cron ngoài gọi vào đây, ví dụ mỗi 10 phút:
 *
 *     curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *          https://menstylehouse.vn/api/cron/huy-don-qua-han
 *
 * Đặt ở route thay vì hẹn giờ trong tiến trình Next: app chạy nhiều bản sao thì
 * mỗi bản sẽ hẹn một cái, và cùng lúc bốn tiến trình cùng huỷ một đơn.
 *
 * Không có `CRON_SECRET` thì route đóng hẳn. Mặc định mở là ai cũng gọi được
 * một endpoint có quyền huỷ đơn hàng loạt.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Chưa đặt CRON_SECRET" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const { holdMinutes } = await getSettings();
  const { daHuy, loi } = await expireUnpaidOrders();
  if (loi.length > 0) console.error("Huỷ đơn quá hạn lỗi:", loi);

  return NextResponse.json(
    { giuDonPhut: holdMinutes, daHuy, soLoi: loi.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
