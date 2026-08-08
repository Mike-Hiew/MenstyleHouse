import { afterAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  ACCEPTED,
  ImageTooLargeError,
  MAX_UPLOAD_BYTES,
  UnsupportedImageError,
  attachImage,
  detachImage,
  imageUrl,
  listProductImages,
  parseImageKey,
  readBlob,
  storeImage,
} from "../src/server/admin/images";
import { db } from "../src/lib/db";

/**
 * Nghiệm thu M4.5: "upload được ảnh trong admin, ảnh hiện đúng trên storefront,
 * đổi ảnh thì URL đổi theo checksum và trình duyệt lấy bản mới".
 *
 * Phần trình duyệt đã chạy qua CDP; ở đây kiểm phần server giữ được ba lời hứa
 * khiến cách lưu ảnh trong DB không phá ngân sách:
 *   1. ảnh nào cũng bị nén và thu nhỏ trước khi vào DB,
 *   2. URL đổi khi và chỉ khi nội dung đổi (nhờ vậy cache mới dám `immutable`),
 *   3. nội dung trùng thì dùng lại blob cũ, xoá ảnh thì blob mồ côi đi theo.
 */

/** Ảnh PNG đặc một màu, kích thước tuỳ ý — thay cho file thật trên đĩa. */
async function png(width: number, height: number, rgb: [number, number, number]) {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  })
    .png()
    .toBuffer();
  return { bytes: buf, type: "image/png" };
}

/** Nhiễu ngẫu nhiên: nén được ít nên dùng để thử ngưỡng dung lượng. */
async function noisyPng(width: number, height: number) {
  const px = Buffer.allocUnsafe(width * height * 3);
  for (let i = 0; i < px.length; i++) px[i] = (i * 2654435761) % 256;
  const buf = await sharp(px, { raw: { width, height, channels: 3 } }).png().toBuffer();
  return { bytes: buf, type: "image/png" };
}

const createdBlobs: string[] = [];
const track = <T extends { blobId: string }>(r: T) => {
  createdBlobs.push(r.blobId);
  return r;
};

afterAll(async () => {
  await db.productImageBlob.deleteMany({ where: { id: { in: createdBlobs } } });
});

describe("kiểm tra đầu vào", () => {
  it("từ chối file vượt mức trước khi giải mã", async () => {
    const huge = { bytes: Buffer.alloc(MAX_UPLOAD_BYTES + 1), type: "image/png" };
    await expect(storeImage(huge)).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it("từ chối định dạng ngoài danh sách", async () => {
    const gif = await png(10, 10, [0, 0, 0]);
    await expect(storeImage({ ...gif, type: "image/gif" })).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
    expect(ACCEPTED).not.toContain("image/gif");
  });

  it("từ chối file không phải ảnh dù mang content-type hợp lệ", async () => {
    // Content-type do trình duyệt khai, không tin được. sharp phải là chốt chặn.
    const fake = { bytes: Buffer.from("<?php echo 1; ?>"), type: "image/png" };
    await expect(storeImage(fake)).rejects.toThrow();
  });
});

describe("nén và thu nhỏ", () => {
  it("thu cạnh dài về tối đa 2000px và chuyển sang WebP", async () => {
    const stored = track(await storeImage(await png(3600, 2400, [200, 40, 20])));

    expect(Math.max(stored.width, stored.height)).toBe(2000);
    // Giữ nguyên tỉ lệ 3:2 chứ không bóp méo.
    expect(stored.width / stored.height).toBeCloseTo(3 / 2, 2);

    const blob = await readBlob(stored.blobId);
    expect(blob?.contentType).toBe("image/webp");
    expect((await sharp(Buffer.from(blob!.data)).metadata()).format).toBe("webp");
  });

  it("không phóng to ảnh nhỏ hơn ngưỡng", async () => {
    const stored = track(await storeImage(await png(300, 400, [10, 90, 180])));
    expect([stored.width, stored.height]).toEqual([300, 400]);
  });

  it("thu nhỏ thêm khi hạ chất lượng vẫn chưa đủ, để ảnh nhiễu cũng lọt dưới 500 KB", async () => {
    // Nhiễu dày là ca xấu nhất: hạ chất lượng gần như không ăn thua, chỉ thu
    // nhỏ mới kéo được dung lượng xuống.
    const stored = track(await storeImage(await noisyPng(2400, 2400)));
    const blob = await readBlob(stored.blobId);

    expect(blob!.byteSize).toBeLessThanOrEqual(500 * 1024);
    expect(blob!.byteSize).toBe(blob!.data.byteLength);
    // Và nó phải nhỏ hơn ngưỡng cạnh dài thường lệ — bằng chứng đã đi tới bậc thu nhỏ.
    expect(Math.max(stored.width, stored.height)).toBeLessThan(2000);
  }, 20000);
});

describe("URL mang checksum", () => {
  it("nội dung khác thì URL khác", async () => {
    const a = track(await storeImage(await png(600, 800, [220, 30, 15])));
    const b = track(await storeImage(await png(600, 800, [15, 30, 220])));
    expect(a.url).not.toBe(b.url);
  });

  it("nội dung trùng thì dùng lại blob cũ thay vì lưu thêm", async () => {
    const first = track(await storeImage(await png(500, 500, [7, 7, 7])));
    const before = await db.productImageBlob.count();

    const again = await storeImage(await png(500, 500, [7, 7, 7]));

    expect(again.blobId).toBe(first.blobId);
    expect(again.url).toBe(first.url);
    expect(await db.productImageBlob.count()).toBe(before);
  });

  it("tách được id từ khoá URL, kể cả khi checksum có dấu gạch", () => {
    expect(parseImageKey("abc123-deadbeefdeadbeef.webp")).toBe("abc123");
    expect(parseImageKey(imageUrl("xyz789", "0011223344556677").split("/").pop()!)).toBe("xyz789");
  });

  it("khoá rác không đọc ra blob nào", async () => {
    expect(parseImageKey("")).toBe("");
    expect(await readBlob(parseImageKey("khong-ton-tai.webp"))).toBeNull();
  });
});

describe("gắn và gỡ ảnh khỏi sản phẩm", () => {
  it("ảnh mới xuống cuối, gỡ ảnh thì blob mồ côi bị dọn", async () => {
    const product = await db.product.findFirstOrThrow({ select: { id: true } });
    const before = await listProductImages(product.id);

    const stored = track(await storeImage(await png(400, 533, [44, 160, 90])));
    const created = await attachImage({
      productId: product.id,
      url: stored.url,
      alt: "Ảnh kiểm thử",
      blobId: stored.blobId,
    });

    const after = await listProductImages(product.id);
    expect(after).toHaveLength(before.length + 1);
    expect(after[after.length - 1]).toMatchObject({ id: created.id, blobId: stored.blobId });

    await detachImage(created.id);

    expect(await listProductImages(product.id)).toHaveLength(before.length);
    expect(await readBlob(stored.blobId)).toBeNull();
  });

  it("hai ảnh dùng chung một blob, gỡ ảnh này không làm hỏng ảnh kia", async () => {
    // Ca thật: cùng một tấm lookbook gắn cho hai sản phẩm. Dedupe theo checksum
    // chỉ có ích nếu quan hệ là nhiều-một — `@unique` trên `blobId` từng làm
    // upload thứ hai chết với lỗi ràng buộc.
    const [a, b] = await db.product.findMany({ take: 2, select: { id: true } });
    const stored = track(await storeImage(await png(450, 600, [120, 20, 200])));

    const first = await attachImage({
      productId: a.id,
      url: stored.url,
      alt: "Dùng chung 1",
      blobId: stored.blobId,
    });
    const second = await attachImage({
      productId: b.id,
      url: stored.url,
      alt: "Dùng chung 2",
      blobId: stored.blobId,
    });

    await detachImage(first.id);

    // Blob phải còn sống vì ảnh thứ hai vẫn trỏ vào.
    expect(await readBlob(stored.blobId)).not.toBeNull();

    await detachImage(second.id);
    expect(await readBlob(stored.blobId)).toBeNull();
  });

  it("gỡ ảnh link ngoài không đụng tới bảng blob", async () => {
    const product = await db.product.findFirstOrThrow({ select: { id: true } });
    const created = await attachImage({
      productId: product.id,
      url: "https://images.unsplash.com/photo-1",
      alt: "Link ngoài",
      blobId: null,
    });

    const blobs = await db.productImageBlob.count();
    await detachImage(created.id);

    expect(await db.productImageBlob.count()).toBe(blobs);
  });

  it("gỡ một ảnh không tồn tại thì im lặng bỏ qua", async () => {
    await expect(detachImage("khong-co-that")).resolves.toBeUndefined();
  });
});
