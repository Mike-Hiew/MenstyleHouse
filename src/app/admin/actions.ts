"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Route } from "next";
import type { Carrier, OrderStatus, Role } from "@prisma/client";
import { assertPermission, ForbiddenError } from "@/server/admin/guard";
import {
  advanceOrderStatus,
  InvalidTransitionError,
  MissingTrackingError,
  setShipping,
} from "@/server/admin/orders";
import {
  attachImage,
  detachImage,
  ImageTooDenseError,
  ImageTooLargeError,
  storeImage,
  UnsupportedImageError,
} from "@/server/admin/images";
import {
  CancelledOrderError,
  issueInvoice,
  OrderNotFoundError,
} from "@/server/admin/invoices";
import { confirmBankTransfer, NotAwaitingTransferError } from "@/server/payments";
import {
  CouponCodeTakenError,
  createCoupon,
  InvalidCouponError,
  toggleCoupon,
  updateCoupon,
} from "@/server/admin/coupons";
import { replyTicket, setTicketStatus, TicketClosedError } from "@/server/admin/tickets";
import { createCustomer, PhoneTakenError } from "@/server/admin/customers";
import { getSettings, setQrImage, settingsSchema, updateSettings } from "@/server/settings";
import { guiMailThat } from "@/server/mail";
import { mailHoaDon, mailMoiNhanVien, mailTraLoiHoTro } from "@/server/mail-templates";
import { getTicket } from "@/server/admin/tickets";
import { ROLE_LABEL } from "@/lib/roles";
import {
  deleteStaff,
  EmailTakenError,
  inviteStaff,
  LastAdminError,
  revokeInvite,
  setUserActive,
  setUserRole,
  StaffInUseError,
  updateStaff,
} from "@/server/admin/staff";
import { CannotEditAdminError, setRolePermissions } from "@/server/admin/permissions";
import {
  addVariant,
  CategoryInUseError,
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteVariant,
  DuplicateVariantError,
  NameTakenError,
  renameCategory,
  VariantInUseError,
} from "@/server/admin/catalog-admin";

export type AdminActionState = { ok?: boolean; message?: string };

/**
 * Đổi trạng thái đơn. Quyền và tính hợp lệ của bước chuyển đều kiểm ở server —
 * ẩn nút ở UI không phải là kiểm soát.
 */
export async function advanceOrderAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = String(form.get("code") ?? "");
  const to = String(form.get("to") ?? "") as OrderStatus;
  const note = String(form.get("note") ?? "").trim() || undefined;

  try {
    const user = await assertPermission("don.doi-trang-thai");
    await advanceOrderStatus(code, to, user.name, note);
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof InvalidTransitionError) return { ok: false, message: e.message };
    if (e instanceof MissingTrackingError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không đổi được trạng thái. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/don-hang");
  revalidatePath("/admin/don-hang/" + code);
  return { ok: true, message: "Đã cập nhật trạng thái đơn." };
}

/* ── Sản phẩm ─────────────────────────────────────────────── */

const productSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Nhập tên sản phẩm").max(160),
  description: z.string().trim().min(10, "Mô tả tối thiểu 10 ký tự").max(2000),
  basePrice: z.coerce.number().int().min(1000, "Giá tối thiểu 1.000 ₫").max(100_000_000),
  salePrice: z.union([z.coerce.number().int().min(0).max(100_000_000), z.literal("")]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  material: z.string().trim().max(120).optional(),
  careNote: z.string().trim().max(300).optional(),
  categoryId: z.string().trim().min(1, "Chọn danh mục"),
  brandId: z.string().trim().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
});

/**
 * Lưu sản phẩm. **Không** đụng tới `Variant.stock` ở đây — tồn kho chỉ đổi qua
 * `lib/inventory.ts`, đúng luật số 2.
 */
export async function saveProductAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const { slug, salePrice, ...rest } = parsed.data;

  try {
    await assertPermission("san-pham.sua");
    const sale = salePrice === "" || salePrice === undefined ? null : Number(salePrice);
    if (sale !== null && sale >= rest.basePrice) {
      return { ok: false, message: "Giá sale phải nhỏ hơn giá gốc." };
    }

    /*
     * Không cho bật bán sản phẩm chưa có biến thể. Khách bấm vào chỉ thấy một
     * trang không chọn được size, không thêm giỏ được — tệ hơn là không thấy
     * sản phẩm đó. Kiểm ở server chứ không ẩn lựa chọn trong ô chọn.
     */
    if (rest.status === "ACTIVE") {
      const soBienThe = await db.variant.count({ where: { product: { slug } } });
      if (soBienThe === 0) {
        return {
          ok: false,
          message: "Sản phẩm chưa có biến thể nào nên chưa chuyển sang Đang bán được.",
        };
      }
    }

    await db.product.update({
      where: { slug },
      data: {
        name: rest.name,
        description: rest.description,
        basePrice: rest.basePrice,
        salePrice: sale,
        status: rest.status,
        material: rest.material || null,
        careNote: rest.careNote || null,
        categoryId: rest.categoryId,
        brandId: rest.brandId || null,
        seoTitle: rest.seoTitle || null,
        seoDescription: rest.seoDescription || null,
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được sản phẩm." };
  }

  revalidatePath("/admin/san-pham");
  revalidatePath("/admin/san-pham/" + slug);
  return { ok: true, message: "Đã lưu thay đổi." };
}

/* ── Ảnh sản phẩm ─────────────────────────────────────────── */

/**
 * Upload ảnh cho sản phẩm. Ảnh nén về WebP rồi lưu thẳng vào DB — quyết định
 * tạm cho giai đoạn thử nghiệm, xem M4.5 trong `docs/BUILD-PLAN.md`.
 */
export async function uploadImageAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const slug = String(form.get("slug") ?? "");
  const alt = String(form.get("alt") ?? "").trim();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Chọn một file ảnh trước đã." };
  }

  try {
    await assertPermission("san-pham.sua");
    const product = await db.product.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!product) return { ok: false, message: "Không tìm thấy sản phẩm." };

    const stored = await storeImage({
      bytes: Buffer.from(await file.arrayBuffer()),
      type: file.type,
    });

    await attachImage({
      productId: product.id,
      url: stored.url,
      alt: alt || product.name,
      blobId: stored.blobId,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof ImageTooLargeError) return { ok: false, message: e.message };
    if (e instanceof ImageTooDenseError) return { ok: false, message: e.message };
    if (e instanceof UnsupportedImageError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được ảnh. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/san-pham/" + slug);
  revalidatePath("/san-pham/" + slug);
  return { ok: true, message: "Đã thêm ảnh." };
}

export async function deleteImageAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const slug = String(form.get("slug") ?? "");
  const imageId = String(form.get("imageId") ?? "");

  try {
    await assertPermission("san-pham.sua");
    await detachImage(imageId);
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không xoá được ảnh." };
  }

  revalidatePath("/admin/san-pham/" + slug);
  revalidatePath("/san-pham/" + slug);
  return { ok: true, message: "Đã xoá ảnh." };
}

/**
 * Phát hành hoá đơn GTGT cho một đơn.
 *
 * Không có action nào huỷ hay xoá hoá đơn — dãy số đã cấp phải liên tục. Sai
 * thông tin thì lập hoá đơn điều chỉnh, đúng như phiếu kho đã ghi sổ.
 */
export async function issueInvoiceAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = String(form.get("code") ?? "");
  let so = "";

  try {
    const actor = await assertPermission("hoa-don.phat-hanh");
    const inv = await issueInvoice(code, actor.id);
    so = inv.symbol + "-" + inv.number;

    // Gửi cho email khai lúc đặt; không có thì thôi, hoá đơn vẫn phát hành xong.
    const don = await db.order.findUnique({
      where: { code },
      select: { vatEmail: true, email: true },
    });
    const nhan = don?.vatEmail || don?.email;
    if (nhan) {
      const caiDat = await getSettings();
      await mailHoaDon({
        to: nhan,
        nguoiMua: inv.buyerName,
        kyHieu: inv.symbol,
        so: inv.number,
        maDon: code,
        tong: inv.grossAmount,
        hotline: caiDat.hotline,
      });
    }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof CancelledOrderError) return { ok: false, message: e.message };
    if (e instanceof OrderNotFoundError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không phát hành được hoá đơn. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/don-hang/" + code);
  revalidatePath("/admin/hoa-don");
  redirect(("/admin/hoa-don/" + so) as Route);
}

/**
 * Xác nhận đã nhận tiền chuyển khoản.
 *
 * Đây là đường duy nhất đưa một đơn sang `PAID` bằng tay, nên chỉ kế toán và
 * quản trị được bấm — nhân viên bán hàng không tự đánh dấu đơn của mình đã thu
 * tiền được.
 */
export async function confirmTransferAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = String(form.get("code") ?? "");
  const note = String(form.get("note") ?? "").trim() || undefined;

  try {
    const actor = await assertPermission("thanh-toan.xac-nhan");
    const { daXacNhanTruocDo } = await confirmBankTransfer(code, actor.name, note);
    revalidatePath("/admin/don-hang");
    revalidatePath("/admin/don-hang/" + code);
    return {
      ok: true,
      message: daXacNhanTruocDo ? "Đơn này đã được xác nhận trước đó." : "Đã ghi nhận thanh toán.",
    };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof NotAwaitingTransferError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không ghi nhận được thanh toán. Bạn thử lại giúp." };
  }
}

/* ── Tạo sản phẩm, biến thể, danh mục ─────────────────────── */

const newProductSchema = z.object({
  name: z.string().trim().min(3, "Tên sản phẩm tối thiểu 3 ký tự").max(160),
  categoryId: z.string().trim().min(1, "Chọn danh mục"),
  brandId: z.string().trim().optional(),
  basePrice: z.coerce.number().int().min(1000, "Giá tối thiểu 1.000 ₫").max(100_000_000),
  description: z.string().trim().min(10, "Mô tả tối thiểu 10 ký tự").max(2000),
  material: z.string().trim().max(120).optional(),
  careNote: z.string().trim().max(300).optional(),
});

/**
 * Tạo sản phẩm rồi đi thẳng sang màn sửa để thêm biến thể và ảnh.
 *
 * Sản phẩm mới luôn là **nháp**: chưa có biến thể thì khách bấm vào chỉ thấy
 * một trang không mua được gì.
 */
export async function createProductAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = newProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  let slug: string;
  try {
    await assertPermission("san-pham.sua");
    const p = await createProduct({ ...parsed.data, brandId: parsed.data.brandId || null });
    slug = p.slug;
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không tạo được sản phẩm. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/san-pham");
  redirect(("/admin/san-pham/" + slug) as Route);
}

const variantSchema = z.object({
  slug: z.string().trim().min(1),
  color: z.string().trim().min(1, "Nhập tên màu").max(40),
  colorHex: z.string().trim().default("#cccccc"),
  size: z.string().trim().min(1, "Nhập size").max(20),
  priceDelta: z.coerce.number().int().min(-10_000_000).max(10_000_000).default(0),
  lowStockAt: z.coerce.number().int().min(0).max(1000).default(10),
});

export async function addVariantAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = variantSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const { slug, ...rest } = parsed.data;

  try {
    await assertPermission("san-pham.sua");
    const v = await addVariant({ productSlug: slug, ...rest });
    revalidatePath("/admin/san-pham/" + slug);
    revalidatePath("/san-pham/" + slug);
    return { ok: true, message: `Đã thêm biến thể ${v.sku}. Tồn bắt đầu ở 0, nhập hàng qua phiếu nhập kho.` };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof DuplicateVariantError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không thêm được biến thể." };
  }
}

export async function deleteVariantAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const slug = String(form.get("slug") ?? "");
  const id = String(form.get("variantId") ?? "");

  try {
    await assertPermission("san-pham.sua");
    await deleteVariant(id);
    revalidatePath("/admin/san-pham/" + slug);
    revalidatePath("/san-pham/" + slug);
    return { ok: true, message: "Đã xoá biến thể." };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof VariantInUseError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không xoá được biến thể." };
  }
}

/**
 * Danh mục và thương hiệu. Một action lo cả bốn việc để `/admin/danh-muc` không
 * phải bày ra bốn form action khác nhau cho cùng một bảng.
 */
export async function catalogMetaAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const viec = String(form.get("viec") ?? "");
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();

  try {
    await assertPermission("danh-muc.quan-ly");

    switch (viec) {
      case "them-danh-muc":
        if (name.length < 2) return { ok: false, message: "Tên danh mục tối thiểu 2 ký tự." };
        await createCategory(name);
        break;
      case "sua-danh-muc":
        if (name.length < 2) return { ok: false, message: "Tên danh mục tối thiểu 2 ký tự." };
        await renameCategory(id, name, Number(form.get("sort") ?? 0) || 0);
        break;
      case "xoa-danh-muc":
        await deleteCategory(id);
        break;
      case "them-thuong-hieu":
        if (name.length < 2) return { ok: false, message: "Tên thương hiệu tối thiểu 2 ký tự." };
        await createBrand(name);
        break;
      case "xoa-thuong-hieu":
        await deleteBrand(id);
        break;
      default:
        return { ok: false, message: "Thao tác không hợp lệ." };
    }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof NameTakenError) return { ok: false, message: e.message };
    if (e instanceof CategoryInUseError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không thực hiện được. Bạn thử lại giúp." };
  }

  revalidatePath("/admin/danh-muc");
  revalidatePath("/admin/san-pham");
  return { ok: true, message: "Đã cập nhật." };
}

/* ── Mã giảm giá ──────────────────────────────────────────── */

const couponSchema = z.object({
  id: z.string().trim().optional(),
  code: z.string().trim().toUpperCase().max(20).optional(),
  type: z.enum(["PERCENT", "FIXED", "FREESHIP"]),
  value: z.coerce.number().int().min(0).max(100_000_000),
  minSubtotal: z.coerce.number().int().min(0).max(100_000_000),
  maxDiscount: z.union([z.coerce.number().int().min(0).max(100_000_000), z.literal("")]).optional(),
  usageLimit: z.union([z.coerce.number().int().min(1).max(1_000_000), z.literal("")]).optional(),
  perUserLimit: z.union([z.coerce.number().int().min(1).max(1000), z.literal("")]).optional(),
  memberOnly: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  startsAt: z.string().trim().min(1, "Chọn ngày bắt đầu"),
  endsAt: z.string().trim().min(1, "Chọn ngày kết thúc"),
});

const soHoacNull = (v: number | "" | undefined) => (v === "" || v === undefined ? null : Number(v));

/**
 * Tạo hoặc sửa mã giảm giá.
 *
 * `usedCount` **không** có trong schema và sẽ không bao giờ có — nó là số lần
 * mã thực sự được tiêu trong transaction đặt đơn, không phải thứ nhập tay.
 */
export async function saveCouponAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = couponSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const d = parsed.data;

  const chung = {
    type: d.type,
    // Miễn phí ship không có "giá trị giảm"; ép 0 để khỏi lưu số rác.
    value: d.type === "FREESHIP" ? 0 : d.value,
    minSubtotal: d.minSubtotal,
    maxDiscount: soHoacNull(d.maxDiscount),
    usageLimit: soHoacNull(d.usageLimit),
    perUserLimit: soHoacNull(d.perUserLimit),
    memberOnly: Boolean(d.memberOnly),
    active: Boolean(d.active),
    startsAt: new Date(d.startsAt),
    endsAt: new Date(d.endsAt),
  };

  try {
    await assertPermission("khuyen-mai.quan-ly");
    if (d.id) {
      await updateCoupon(d.id, chung);
    } else {
      if (!d.code) return { ok: false, message: "Nhập mã giảm giá." };
      await createCoupon({ ...chung, code: d.code });
    }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof InvalidCouponError) return { ok: false, message: e.message };
    if (e instanceof CouponCodeTakenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được mã giảm giá." };
  }

  revalidatePath("/admin/khuyen-mai");
  redirect("/admin/khuyen-mai" as Route);
}

export async function toggleCouponAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const id = String(form.get("id") ?? "");
  const bat = String(form.get("active") ?? "") === "1";

  try {
    await assertPermission("khuyen-mai.quan-ly");
    await toggleCoupon(id, bat);
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không đổi được trạng thái mã." };
  }

  revalidatePath("/admin/khuyen-mai");
  return { ok: true, message: bat ? "Đã bật mã." : "Đã tắt mã." };
}

/* ── Hỗ trợ ───────────────────────────────────────────────── */

const replySchema = z.object({
  code: z.string().trim().min(1),
  body: z.string().trim().min(2, "Nhập nội dung trả lời").max(4000),
  status: z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]).optional(),
});

/**
 * Trả lời khách. Là **thêm** một tin nhắn, không sửa tin cũ — tranh chấp đổi
 * trả về sau đọc lại được đúng thứ hai bên đã nói.
 */
export async function replyTicketAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = replySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const { code, body, status } = parsed.data;

  try {
    const actor = await assertPermission("ho-tro.tra-loi");
    await replyTicket(code, { body, actorName: actor.name, status });

    /*
     * Báo cho khách — **sau** khi đã lưu, và lỗi mail không làm hỏng việc trả
     * lời. Liên hệ lấy từ tin đầu tiên khách tự khai (`Tên · liên hệ`) nên có
     * thể là số điện thoại; chỉ gửi khi đúng là email.
     */
    const t = await getTicket(code);
    const lienHe = t?.messages[0]?.authorName.split("·").at(-1)?.trim() ?? "";
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lienHe)) {
      const caiDat = await getSettings();
      await mailTraLoiHoTro({
        to: lienHe,
        maYeuCau: code,
        tieuDe: t!.subject,
        noiDung: body,
        hotline: caiDat.hotline,
      });
    }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof TicketClosedError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không gửi được trả lời." };
  }

  revalidatePath("/admin/ho-tro");
  revalidatePath("/admin/ho-tro/" + code);
  return { ok: true, message: "Đã gửi trả lời cho khách." };
}

export async function setTicketStatusAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = String(form.get("code") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["OPEN", "PENDING", "RESOLVED", "CLOSED"].includes(status)) {
    return { ok: false, message: "Trạng thái không hợp lệ." };
  }

  try {
    await assertPermission("ho-tro.tra-loi");
    await setTicketStatus(code, status as "OPEN" | "PENDING" | "RESOLVED" | "CLOSED");
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không đổi được trạng thái." };
  }

  revalidatePath("/admin/ho-tro");
  revalidatePath("/admin/ho-tro/" + code);
  return { ok: true, message: "Đã cập nhật trạng thái." };
}

/**
 * Ghi thông tin vận chuyển nhập tay.
 *
 * Thay cho việc nối API hãng vận chuyển: cửa hàng bàn giao hàng xong thì gõ mã
 * vận đơn vào đây, khách tra đơn ở storefront thấy ngay.
 */
export async function setShippingAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const code = String(form.get("code") ?? "");
  const raw = String(form.get("carrier") ?? "");
  const tracking = String(form.get("trackingCode") ?? "").trim() || null;

  const carrier =
    raw === "" ? null : (["GHN", "GHTK", "VIETTEL_POST", "STORE_PICKUP"].includes(raw) ? (raw as Carrier) : null);
  if (raw !== "" && carrier === null) {
    return { ok: false, message: "Đơn vị vận chuyển không hợp lệ." };
  }

  try {
    const actor = await assertPermission("don.van-chuyen");
    await setShipping(code, { carrier, trackingCode: tracking, actorName: actor.name });
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được thông tin vận chuyển." };
  }

  revalidatePath("/admin/don-hang/" + code);
  return { ok: true, message: "Đã lưu thông tin vận chuyển." };
}

/* ── Khách hàng ───────────────────────────────────────────── */

export type NewCustomerState = AdminActionState & { id?: string; matKhauTam?: string };

const customerSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên khách hàng").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Số điện thoại phải có 10 số và bắt đầu bằng 0"),
  email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
});

/**
 * Tạo tài khoản cho khách mua tại cửa hàng.
 *
 * Trả mật khẩu tạm về cho form hiện **một lần**. Không ghi nó vào log hay vào
 * `OrderEvent` — chỗ nào lưu lại được là chỗ đó rò ra được.
 */
export async function createCustomerAction(
  _prev: NewCustomerState,
  form: FormData,
): Promise<NewCustomerState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("khach-hang.tao");
    const { id, matKhauTam } = await createCustomer({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
    });
    revalidatePath("/admin/khach-hang");
    return { ok: true, id, matKhauTam };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof PhoneTakenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không tạo được tài khoản." };
  }
}

/* ── Cài đặt cửa hàng ─────────────────────────────────────── */

export async function saveSettingsAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  try {
    await assertPermission("cai-dat.quan-ly");
    await updateSettings(parsed.data);
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được cài đặt." };
  }

  /*
   * Cài đặt chạm gần như mọi trang: hoá đơn lấy thuế suất, giỏ lấy ngưỡng miễn
   * phí ship, chân trang lấy thông tin cửa hàng. Xoá cache toàn bộ layout thay
   * vì liệt kê từng đường dẫn rồi sót một chỗ hiển thị số cũ.
   */
  revalidatePath("/", "layout");
  return { ok: true, message: "Đã lưu cài đặt cửa hàng." };
}

/** Đổi vai trò một thành viên. Chỉ quản trị được đụng. */
export async function setRoleAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const id = String(form.get("id") ?? "");
  const role = String(form.get("role") ?? "");
  const hopLe = ["CUSTOMER", "STAFF", "WAREHOUSE", "ACCOUNTANT", "ADMIN"];
  if (!hopLe.includes(role)) return { ok: false, message: "Vai trò không hợp lệ." };

  try {
    const actor = await assertPermission("phan-quyen.quan-ly");
    /*
     * Không cho tự hạ quyền chính mình. Quản trị duy nhất tự đổi thành nhân
     * viên là khoá cửa từ bên trong: không còn ai vào được màn phân quyền để
     * sửa lại.
     */
    if (actor.id === id && role !== "ADMIN") {
      return { ok: false, message: "Không tự đổi vai trò của chính mình được." };
    }
    await setUserRole(id, role as Role);
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof LastAdminError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không đổi được vai trò." };
  }

  revalidatePath("/admin/cai-dat");
  return { ok: true, message: "Đã đổi vai trò." };
}

/**
 * Tải lên hoặc gỡ ảnh QR chuyển khoản.
 *
 * Tách khỏi `saveSettingsAction` vì đây là upload file: gộp chung thì mỗi lần
 * sửa một con số cũng phải gửi lại cả tấm ảnh qua Server Action.
 */
export async function saveQrAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const go = String(form.get("go") ?? "") === "1";
  const file = form.get("qr");

  try {
    await assertPermission("cai-dat.quan-ly");

    if (go) {
      await setQrImage(null);
      revalidatePath("/", "layout");
      return { ok: true, message: "Đã gỡ ảnh QR." };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Chọn file ảnh QR trước đã." };
    }

    const stored = await storeImage({
      bytes: Buffer.from(await file.arrayBuffer()),
      type: file.type,
      // QR nén lossy có thể làm máy quét đọc không ra.
      khongMatDuLieu: true,
    });
    await setQrImage({ url: stored.url, blobId: stored.blobId });
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof ImageTooLargeError) return { ok: false, message: e.message };
    if (e instanceof ImageTooDenseError) return { ok: false, message: e.message };
    if (e instanceof UnsupportedImageError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được ảnh QR. Bạn thử lại giúp." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Đã cập nhật ảnh QR." };
}

/* ── Thành viên & phân quyền ──────────────────────────────── */

/** Ghi lại toàn bộ khả năng của một vai trò. Ô nào không tick là bỏ. */
export async function saveRolePermissionsAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const role = String(form.get("role") ?? "");
  if (!["STAFF", "WAREHOUSE", "ACCOUNTANT"].includes(role)) {
    return { ok: false, message: "Vai trò không hợp lệ hoặc không sửa được." };
  }

  try {
    await assertPermission("phan-quyen.quan-ly");
    await setRolePermissions(role as Role, form.getAll("perm").map(String));
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof CannotEditAdminError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không lưu được phân quyền." };
  }

  /*
   * Quyền chạm mọi trang quản trị và cả sidebar. Xoá cache toàn layout thay vì
   * liệt kê từng đường dẫn rồi sót một chỗ vẫn hiện theo quyền cũ.
   */
  revalidatePath("/", "layout");
  return { ok: true, message: "Đã lưu phân quyền." };
}

export type InviteState = AdminActionState & { duongDan?: string };

/**
 * Mời một người vào khu quản trị.
 *
 * Chưa có hệ thống gửi mail nên trả về **đường dẫn mời** để quản trị tự gửi.
 * Token nằm trong đường dẫn, người được mời tự đặt mật khẩu — không ai phải đọc
 * mật khẩu của người khác qua điện thoại.
 */
export async function inviteStaffAction(
  _prev: InviteState,
  form: FormData,
): Promise<InviteState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Nhập email hợp lệ." };
  }
  if (!["STAFF", "WAREHOUSE", "ACCOUNTANT", "ADMIN"].includes(role)) {
    return { ok: false, message: "Vai trò không hợp lệ." };
  }

  try {
    const actor = await assertPermission("phan-quyen.quan-ly");
    const m = await inviteStaff({ email, role: role as Role, invitedById: actor.id });

    const caiDat = await getSettings();
    const gui = await mailMoiNhanVien({
      to: email,
      vaiTro: ROLE_LABEL[role as Role],
      token: m.token,
      nguoiMoi: actor.name,
      hotline: caiDat.hotline,
    });

    revalidatePath("/admin/cai-dat");
    /*
     * Luôn trả về đường dẫn, kể cả khi mail đã gửi được: mail có thể rơi vào
     * hộp thư rác, và người mời cần một đường lui để gửi tay.
     */
    return {
      ok: true,
      message:
        gui.ok && guiMailThat()
          ? `Đã gửi lời mời tới ${email}.`
          : `Đã tạo lời mời cho ${email}. Chưa bật gửi mail nên bạn gửi đường dẫn dưới đây giúp.`,
      duongDan: "/nhan-loi-moi/" + m.token,
    };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof EmailTakenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không tạo được lời mời." };
  }
}

/** Một action lo cả bốn thao tác trên một thành viên. */
export async function staffAction(
  _prev: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const viec = String(form.get("viec") ?? "");
  const id = String(form.get("id") ?? "");

  try {
    const actor = await assertPermission("phan-quyen.quan-ly");

    /*
     * Không tự đụng vào tài khoản của chính mình. Tự hạ quyền hay tự tắt là
     * khoá cửa từ bên trong ngay lập tức, kể cả khi vẫn còn quản trị khác.
     */
    if (actor.id === id && viec !== "sua") {
      return { ok: false, message: "Không tự đổi vai trò hay tự tắt tài khoản của mình được." };
    }

    switch (viec) {
      case "doi-vai-tro": {
        const role = String(form.get("role") ?? "");
        if (!["CUSTOMER", "STAFF", "WAREHOUSE", "ACCOUNTANT", "ADMIN"].includes(role)) {
          return { ok: false, message: "Vai trò không hợp lệ." };
        }
        await setUserRole(id, role as Role);
        break;
      }
      case "bat":
        await setUserActive(id, true);
        break;
      case "tat":
        await setUserActive(id, false);
        break;
      case "sua":
        await updateStaff(id, {
          name: String(form.get("name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim().toLowerCase() || null,
        });
        break;
      case "xoa":
        await deleteStaff(id);
        break;
      case "thu-hoi-moi":
        await revokeInvite(id);
        break;
      default:
        return { ok: false, message: "Thao tác không hợp lệ." };
    }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, message: e.message };
    if (e instanceof LastAdminError) return { ok: false, message: e.message };
    if (e instanceof StaffInUseError) return { ok: false, message: e.message };
    if (e instanceof EmailTakenError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Không thực hiện được." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Đã cập nhật." };
}
