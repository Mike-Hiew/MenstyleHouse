import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Còn sống không.
 *
 * **Có hỏi tới cơ sở dữ liệu.** Chỉ trả `ok` mà không truy vấn thì endpoint này
 * xanh cả lúc Postgres đã chết — mà app không có DB thì mọi trang đều lỗi, tức
 * là báo xanh đúng vào lúc cần báo đỏ nhất.
 *
 * Không trả chi tiết lỗi ra ngoài: endpoint này mở công khai cho bộ theo dõi
 * gọi, không việc gì phải khai chuỗi kết nối hay phiên bản cho người lạ.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[suc-khoe]", e);
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
