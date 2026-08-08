import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Ảnh sản phẩm lưu thẳng trong Postgres — quyết định tạm cho giai đoạn thử
 * nghiệm, xem M4.5 trong `docs/BUILD-PLAN.md`.
 *
 * Hai điều giữ cho nó không đắt:
 * 1. Bytes nằm ở bảng riêng `ProductImageBlob`, truy vấn catalog không đụng tới.
 * 2. URL mang checksum nên route ảnh trả `immutable` được — CDN gánh gần hết,
 *    hàm chỉ chạy lần đầu mỗi edge.
 */

/** Chặn trước khi giải mã: file 50MB không nên đi vào bộ nhớ server. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Kích thước và dung lượng sau khi nén — đủ cho ảnh 3/4 trên màn 2x. */
const MAX_EDGE = 2000;
const TARGET_BYTES = 500 * 1024;

/** Hạ chất lượng trước; hết nấc mới thu nhỏ. Xem `toWebp`. */
const QUALITY_STEPS = [82, 70, 60];
/** Dưới mức này ảnh sản phẩm hết dùng được — thà báo lỗi còn hơn. */
const MIN_EDGE = 600;
const SHRINK_ATTEMPTS = 3;

export const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export class ImageTooLargeError extends Error {
  constructor(bytes: number) {
    super(
      `Ảnh nặng ${Math.round(bytes / 1024 / 1024)}MB, vượt mức ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
    );
    this.name = "ImageTooLargeError";
  }
}

/** Nén hết cỡ rồi vẫn quá nặng — hiếm, nhưng phải chặn chứ không nuốt. */
export class ImageTooDenseError extends Error {
  constructor(bytes: number) {
    super(
      `Nén hết cỡ ảnh vẫn còn ${Math.round(bytes / 1024)} KB, quá mức ` +
        `${TARGET_BYTES / 1024} KB. Ảnh có lẽ quá nhiều hạt nhiễu — thử ảnh khác ` +
        `hoặc giảm kích thước trước khi tải lên.`,
    );
    this.name = "ImageTooDenseError";
  }
}

export class UnsupportedImageError extends Error {
  constructor(type: string) {
    super(`Không nhận định dạng "${type}". Dùng JPEG, PNG, WebP hoặc AVIF.`);
    this.name = "UnsupportedImageError";
  }
}

/**
 * Nén về WebP cho tới khi lọt dưới `TARGET_BYTES`.
 *
 * Hạ chất lượng trước vì mất chút nét thì ít người nhận ra. Khi chất lượng đã
 * kịch nấc mà vẫn nặng thì thu nhỏ tiếp — ảnh nhỏ mà sạch dễ nhìn hơn ảnh to mà
 * nhoè. Ảnh nhiễu dày (ảnh scan, ảnh chụp màn hình nhiều hạt) chỉ chịu thua ở
 * đường thu nhỏ này.
 *
 * Tới bậc cuối vẫn không lọt thì từ chối hẳn. Trả về "ảnh to nhất mình nén
 * được" nghe có vẻ tử tế hơn, nhưng nó để lọt blob vài MB vào Postgres — đúng
 * thứ M4.5 sinh ra để chặn.
 */
async function toWebp(input: Buffer, khongMatDuLieu = false) {
  /*
   * `sharp` nạp động chứ không import ở đầu file: route `/api/anh/[key]` chỉ
   * cần `readBlob` trong đúng module này, và nó phục vụ mọi lượt xem ảnh của
   * storefront. Kéo cả một thư viện nén ảnh vào đường đọc là bắt mỗi lần khởi
   * động nguội trả tiền cho thứ nó không dùng.
   */
  const { default: sharp } = await import("sharp");

  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();

  const encode = async (edge: number, quality: number) => {
    const out = await base
      .clone()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp(khongMatDuLieu ? { lossless: true } : { quality })
      .toBuffer({ resolveWithObject: true });
    return {
      buffer: out.data,
      width: out.info.width,
      height: out.info.height,
      byteSize: out.data.byteLength,
    };
  };

  let edge = Math.min(MAX_EDGE, Math.max(meta.width ?? MAX_EDGE, meta.height ?? MAX_EDGE));
  let shot = await encode(edge, QUALITY_STEPS[0]);

  /*
   * Ảnh QR đi đường riêng: nén lossy làm nhiễu cạnh các ô vuông và máy quét có
   * thể đọc không ra — mà đọc được là toàn bộ lý do tấm ảnh tồn tại. Lossless
   * trên ảnh hai màu lại còn nhỏ hơn lossy, nên không đánh đổi gì.
   */
  if (khongMatDuLieu) {
    if (shot.byteSize > TARGET_BYTES) throw new ImageTooDenseError(shot.byteSize);
    return shot;
  }
  for (const quality of QUALITY_STEPS.slice(1)) {
    if (shot.byteSize <= TARGET_BYTES) return shot;
    shot = await encode(edge, quality);
  }
  if (shot.byteSize <= TARGET_BYTES) return shot;

  /*
   * Chất lượng đã kịch nấc. Dung lượng WebP tỉ lệ xấp xỉ với số điểm ảnh, nên
   * ước lượng thẳng tỉ lệ cần thu (nhân 0.95 lấy biên an toàn) thay vì dò từng
   * bậc — mã hoá lại một ảnh 2000px là chỗ tốn thời gian thật sự, và đường này
   * chạy ngay trong lúc admin ngồi đợi form.
   */
  for (let i = 0; i < SHRINK_ATTEMPTS; i++) {
    const next = Math.max(
      MIN_EDGE,
      Math.floor(edge * Math.sqrt(TARGET_BYTES / shot.byteSize) * 0.95),
    );
    if (next >= edge) break;

    edge = next;
    shot = await encode(edge, QUALITY_STEPS[1]);
    if (shot.byteSize <= TARGET_BYTES) return shot;
    if (edge === MIN_EDGE) break;
  }

  throw new ImageTooDenseError(shot.byteSize);
}

export type StoredImage = { blobId: string; url: string; width: number; height: number };

/**
 * Lưu ảnh vào DB và trả về URL đã kèm checksum.
 * Trùng nội dung thì dùng lại blob cũ — upload đi upload lại cùng một ảnh
 * không làm DB phình thêm.
 */
export async function storeImage(file: {
  bytes: Buffer;
  type: string;
  /** Ảnh QR: nén không mất dữ liệu để máy quét luôn đọc được. */
  khongMatDuLieu?: boolean;
}): Promise<StoredImage> {
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new ImageTooLargeError(file.bytes.byteLength);
  if (!ACCEPTED.includes(file.type)) throw new UnsupportedImageError(file.type);

  const out = await toWebp(file.bytes, file.khongMatDuLieu);
  const checksum = createHash("sha256").update(out.buffer).digest("hex").slice(0, 16);

  const existing = await db.productImageBlob.findFirst({
    where: { checksum, byteSize: out.byteSize },
    select: { id: true, width: true, height: true },
  });
  if (existing) {
    return {
      blobId: existing.id,
      url: imageUrl(existing.id, checksum),
      width: existing.width,
      height: existing.height,
    };
  }

  const blob = await db.productImageBlob.create({
    data: {
      data: new Uint8Array(out.buffer),
      contentType: "image/webp",
      width: out.width,
      height: out.height,
      byteSize: out.byteSize,
      checksum,
    },
    select: { id: true },
  });

  return { blobId: blob.id, url: imageUrl(blob.id, checksum), width: out.width, height: out.height };
}

/** `/api/anh/<id>-<checksum>.webp` — đổi ảnh là đổi URL nên cache khỏi phải dò. */
export function imageUrl(blobId: string, checksum: string) {
  return `/api/anh/${blobId}-${checksum}.webp`;
}

/** Tách id khỏi phần checksum và đuôi file. */
export function parseImageKey(key: string): string {
  return key.replace(/\.webp$/i, "").split("-")[0] ?? "";
}

export async function readBlob(id: string) {
  return db.productImageBlob.findUnique({
    where: { id },
    select: { data: true, contentType: true, checksum: true, byteSize: true },
  });
}

/** Ảnh của một sản phẩm, cho màn quản trị. */
export async function listProductImages(productId: string) {
  return db.productImage.findMany({
    where: { productId },
    orderBy: { sort: "asc" },
    select: { id: true, url: true, alt: true, sort: true, blobId: true },
  });
}

export async function attachImage(input: {
  productId: string;
  url: string;
  alt: string;
  blobId: string | null;
}) {
  const last = await db.productImage.findFirst({
    where: { productId: input.productId },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });

  return db.productImage.create({
    data: { ...input, sort: (last?.sort ?? -1) + 1 },
    select: { id: true },
  });
}

/**
 * Xoá ảnh khỏi sản phẩm; blob mồ côi cũng dọn luôn để DB không phình.
 *
 * `images: { none: {} }` chứ không xoá thẳng: một blob có thể đang được ảnh
 * khác dùng chung (xem `storeImage`), xoá theo id sẽ làm hỏng ảnh của sản phẩm
 * không liên quan.
 */
export async function detachImage(imageId: string) {
  const image = await db.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, blobId: true },
  });
  if (!image) return;

  await db.productImage.delete({ where: { id: image.id } });
  if (image.blobId) {
    /*
     * "Mồ côi" phải tính cả phía cài đặt: cùng một blob có thể đang là ảnh QR
     * chuyển khoản, vì blob chia sẻ theo checksum. Xoá nó chỉ vì không còn
     * `ProductImage` nào trỏ tới sẽ làm mất tấm QR ở trang thanh toán.
     */
    const laQr = await db.storeSetting.count({ where: { qrBlobId: image.blobId } });
    if (laQr === 0) {
      await db.productImageBlob.deleteMany({
        where: { id: image.blobId, images: { none: {} } },
      });
    }
  }
}
