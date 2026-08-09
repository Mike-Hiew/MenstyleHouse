import "server-only";
import { db } from "@/lib/db";
import { cardInclude, type ProductCardData } from "@/server/catalog";

/**
 * Sản phẩm yêu thích — tab thứ tư ở trang tài khoản của mockup.
 *
 * Chỉ dành cho người đã đăng nhập. Cố tình **không** lưu cho khách vãng lai:
 * danh sách thích nằm trong cookie thì đổi máy là mất, mà đây lại đúng là thứ
 * người ta lưu để hôm sau quay lại mua.
 */

/** Bật/tắt. Trả về trạng thái sau khi bấm. */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  const co = await db.wishlist.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (co) {
    await db.wishlist.delete({ where: { id: co.id } });
    return false;
  }

  await db.wishlist.create({ data: { userId, productId } });
  return true;
}

export async function isWished(userId: string, productId: string): Promise<boolean> {
  return Boolean(
    await db.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    }),
  );
}

export async function listWishlist(userId: string): Promise<ProductCardData[]> {
  const rows = await db.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { product: { include: cardInclude } },
  });
  // Sản phẩm đã ngừng bán thì bỏ khỏi danh sách hiển thị — bấm vào là ngõ cụt.
  return rows.map((r) => r.product).filter((p) => p.status === "ACTIVE");
}

