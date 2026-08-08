import { NextResponse } from "next/server";
import { parseImageKey, readBlob } from "@/server/admin/images";

/**
 * Phục vụ ảnh lưu trong DB.
 *
 * URL mang checksum (`<id>-<checksum>.webp`) nên nội dung tại một URL không bao
 * giờ đổi — nhờ đó đặt được `immutable` và CDN gánh gần hết. Không có header
 * này thì mỗi lượt xem là một lần chạy hàm cộng một truy vấn DB, và lúc đó lưu
 * ảnh trong DB đúng là lựa chọn tệ.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const id = parseImageKey(key);
  if (!id) return new NextResponse("Không hợp lệ", { status: 400 });

  const blob = await readBlob(id);
  if (!blob) return new NextResponse("Không tìm thấy ảnh", { status: 404 });

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.contentType,
      "Content-Length": String(blob.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${blob.checksum}"`,
    },
  });
}
