import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { applyCoupon } from "./coupons";
import { currentUserId } from "@/auth";

/**
 * Giỏ hàng của khách vãng lai nhận diện bằng cookie `cartToken`; member sẽ gắn
 * thêm `userId` khi đăng nhập (M2 phần tài khoản). Component không gọi Prisma —
 * mọi truy vấn nằm ở đây theo `docs/CLAUDE-rules.md`.
 */

const COOKIE = "cartToken";
const ONE_YEAR = 60 * 60 * 24 * 365;

const cartInclude = Prisma.validator<Prisma.CartInclude>()({
  items: {
    orderBy: { id: "asc" },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: { sort: "asc" }, take: 1 },
              category: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  },
});

export type CartData = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type CartLine = {
  itemId: string;
  variantId: string;
  sku: string;
  productName: string;
  slug: string;
  color: string;
  size: string;
  imageUrl: string | null;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  /** Tồn kho hiện tại, để cảnh báo khi khách để giỏ lâu rồi quay lại. */
  stock: number;
};

export type CartView = {
  token: string;
  lines: CartLine[];
  count: number;
  subtotal: number;
};

/** Giá thực tế của một biến thể = giá sản phẩm (đã trừ sale) + chênh theo size. */
function unitPriceOf(v: {
  priceDelta: number;
  product: { basePrice: number; salePrice: number | null };
}) {
  return (v.product.salePrice ?? v.product.basePrice) + v.priceDelta;
}

function toView(cart: CartData): CartView {
  const lines = cart.items.map((it) => {
    const unitPrice = unitPriceOf(it.variant);
    return {
      itemId: it.id,
      variantId: it.variantId,
      sku: it.variant.sku,
      productName: it.variant.product.name,
      slug: it.variant.product.slug,
      color: it.variant.color,
      size: it.variant.size,
      imageUrl: it.variant.product.images[0]?.url ?? null,
      unitPrice,
      qty: it.qty,
      lineTotal: unitPrice * it.qty,
      stock: it.variant.stock,
    };
  });

  return {
    token: cart.token,
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
  };
}

/**
 * Tìm giỏ đang dùng: **của người đăng nhập trước, cookie sau**.
 *
 * Thứ tự này là chỗ đã từng hỏng và làm mất giỏ của mọi khách đăng nhập. Khi
 * gộp giỏ, hàng được chuyển sang một `Cart` mang `userId` với token mới, còn
 * cookie trên trình duyệt vẫn trỏ vào token cũ **đã bị xoá**. Tra theo cookie
 * trước thì không thấy gì, và giỏ hiện ra trống trong khi hàng vẫn nằm nguyên
 * trong DB — khách chất đầy giỏ, bấm đăng nhập ở bước thanh toán, rồi mất sạch.
 */
async function timGio(): Promise<CartData | null> {
  const userId = await currentUserId();
  if (userId) {
    const cua = await db.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: cartInclude,
    });
    if (cua) return cua;
  }

  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { token }, include: cartInclude });
}

/** Đọc giỏ mà **không** tạo mới — dùng cho header và các trang chỉ hiển thị. */
export async function readCart(): Promise<CartView | null> {
  const cart = await timGio();
  return cart ? toView(cart) : null;
}

export async function getCartCount(): Promise<number> {
  return (await readCart())?.count ?? 0;
}

/**
 * Lấy giỏ, tạo nếu chưa có. Chỉ gọi từ Server Action — đặt cookie trong lúc
 * render trang sẽ bị Next từ chối.
 */
export async function getOrCreateCart(): Promise<CartData> {
  const jar = await cookies();

  const dangCo = await timGio();
  if (dangCo) {
    // Cookie có thể đang trỏ vào giỏ khác (hoặc đã bị xoá sau khi gộp); kéo nó
    // về đúng giỏ đang dùng để lần đọc sau không phải tra lại theo userId.
    if (jar.get(COOKIE)?.value !== dangCo.token) {
      jar.set(COOKIE, dangCo.token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ONE_YEAR,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return dangCo;
  }

  const fresh = randomUUID();
  const userId = await currentUserId();
  const cart = await db.cart.create({ data: { token: fresh, userId }, include: cartInclude });
  jar.set(COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
    secure: process.env.NODE_ENV === "production",
  });
  return cart;
}

export async function getCartView(): Promise<CartView> {
  return toView(await getOrCreateCart());
}

/** Thêm vào giỏ; đã có biến thể đó thì cộng dồn, không tạo dòng mới. */
export async function addToCart(variantId: string, qty: number): Promise<CartView> {
  const cart = await getOrCreateCart();
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    select: { id: true, stock: true, sku: true },
  });

  const existing = cart.items.find((i) => i.variantId === variantId);
  // Chốt trần theo tồn kho ngay ở đây để giỏ không bao giờ vượt hàng có thật.
  const wanted = Math.min((existing?.qty ?? 0) + qty, variant.stock);

  if (wanted <= 0) return toView(cart);

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, qty: wanted },
    update: { qty: wanted },
  });
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

  return toView(await db.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude }));
}

/** `qty = 0` là xoá dòng. */
export async function updateCartItem(itemId: string, qty: number): Promise<CartView> {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return toView(cart);

  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({
      where: { id: itemId },
      data: { qty: Math.min(qty, item.variant.stock) },
    });
  }

  return toView(await db.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude }));
}

export async function removeCartItem(itemId: string): Promise<CartView> {
  return updateCartItem(itemId, 0);
}

/** Xoá sạch giỏ sau khi đặt đơn thành công. */
export async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
}

/**
 * Gộp giỏ khách vãng lai vào giỏ member khi đăng nhập — **cộng** số lượng chứ
 * không ghi đè, đúng `docs/API.md`. Dùng ở phần tài khoản của M2.
 */
export async function mergeGuestCart(guestToken: string, userId: string) {
  const guest = await db.cart.findUnique({ where: { token: guestToken }, include: cartInclude });
  if (!guest || guest.userId === userId) return;

  const mine = await db.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: cartInclude,
  });

  /*
   * Chưa có giỏ member thì **nhận luôn giỏ khách làm giỏ của mình**, giữ nguyên
   * token. Bản trước tạo giỏ mới với token ngẫu nhiên rồi xoá giỏ khách, thành
   * ra cookie trên trình duyệt trỏ vào một dòng không còn tồn tại và khách mất
   * sạch giỏ ngay lúc đăng nhập.
   */
  if (!mine) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }

  for (const item of guest.items) {
    const existing = mine.items.find((i) => i.variantId === item.variantId);
    const qty = Math.min((existing?.qty ?? 0) + item.qty, item.variant.stock);
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: mine.id, variantId: item.variantId } },
      create: { cartId: mine.id, variantId: item.variantId, qty },
      update: { qty },
    });
  }

  await db.cart.delete({ where: { id: guest.id } });
}

/* ── Mã giảm giá gắn vào giỏ ──────────────────────────────── */

/** Lưu mã đã áp vào giỏ; `null` là gỡ mã. Chỉ lưu id — tiền tính lại lúc đặt. */
export async function setCartCoupon(couponId: string | null) {
  const cart = await getOrCreateCart();
  await db.cart.update({ where: { id: cart.id }, data: { couponId } });
}

/**
 * Mã đang áp trên giỏ, kèm số tiền giảm **tính lại** theo tạm tính hiện tại.
 * Mã hết hạn hoặc đơn tụt dưới mức tối thiểu thì coi như chưa áp — không bao
 * giờ tin con số đã lưu ở lần trước.
 */
export async function readCartCoupon(): Promise<{ code: string; discount: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const cart = await db.cart.findUnique({ where: { token }, include: cartInclude });
  if (!cart?.couponId) return null;

  const coupon = await db.coupon.findUnique({ where: { id: cart.couponId } });
  if (!coupon) return null;

  const res = await applyCoupon(coupon.code, toView(cart).subtotal);
  return res.ok ? { code: res.code, discount: res.discount } : null;
}
