import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Cài đặt cửa hàng.
 *
 * Đọc qua `cache()` của React: một lần render có thể có năm nơi cùng cần thuế
 * suất và thông tin cửa hàng (hoá đơn, chân trang, khối chuyển khoản…), gọi
 * thẳng DB mỗi chỗ là năm truy vấn cho một hàng dữ liệu không đổi.
 *
 * Không có `create` ở đây: dòng cài đặt do migration đặt sẵn. Thiếu nó nghĩa là
 * DB chưa chạy hết migration, và tự tạo lại bằng giá trị mặc định sẽ **giấu**
 * chuyện đó đi — cửa hàng chạy tiếp với thuế suất và ngưỡng hạng sai mà không
 * ai biết.
 */

export const ID = "cua-hang";

export class SettingsMissingError extends Error {
  constructor() {
    super(
      "Chưa có dòng cài đặt cửa hàng. Chạy `npm run db:deploy` để áp hết migration.",
    );
    this.name = "SettingsMissingError";
  }
}

export const getSettings = cache(async () => {
  const s = await db.storeSetting.findUnique({ where: { id: ID } });
  if (!s) throw new SettingsMissingError();
  return s;
});

export type StoreSettings = Awaited<ReturnType<typeof getSettings>>;

const tien = (max = 100_000_000) => z.coerce.number().int().min(0).max(max);

export const settingsSchema = z
  .object({
    shopName: z.string().trim().min(2, "Nhập tên cửa hàng").max(120),
    taxCode: z
      .string()
      .trim()
      .regex(/^\d{10}(-\d{3})?$/, "Mã số thuế gồm 10 số, chi nhánh thêm -xxx"),
    address: z.string().trim().min(5, "Nhập địa chỉ").max(200),
    hotline: z.string().trim().min(4, "Nhập hotline").max(30),
    email: z.string().trim().email("Email không hợp lệ"),
    bankName: z.string().trim().min(2, "Nhập tên ngân hàng").max(80),
    bankAccount: z.string().trim().min(4, "Nhập số tài khoản").max(40),
    bankOwner: z.string().trim().min(2, "Nhập chủ tài khoản").max(120),

    shipInnerCity: tien(1_000_000),
    shipProvince: tien(1_000_000),
    freeShipFrom: tien(),
    vatRate: z.coerce.number().int().min(0, "Thuế suất từ 0").max(20, "Thuế suất tối đa 20%"),
    holdMinutes: z.coerce
      .number()
      .int()
      .min(15, "Giữ đơn tối thiểu 15 phút")
      .max(60 * 24 * 7, "Giữ đơn tối đa 7 ngày"),

    tierSilver: tien(),
    tierGold: tien(),
    tierDiamond: tien(),

    payCod: z.coerce.boolean().optional(),
    payBank: z.coerce.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    /*
     * Ngưỡng phải tăng dần. Đặt VÀNG thấp hơn BẠC thì hàm phân hạng vẫn chạy
     * nhưng hạng VÀNG không bao giờ với tới được — hỏng im lặng, và chỉ lộ ra
     * khi khách gọi lên hỏi vì sao mãi không lên hạng.
     */
    if (v.tierGold <= v.tierSilver) {
      ctx.addIssue({
        code: "custom",
        path: ["tierGold"],
        message: "Ngưỡng VÀNG phải cao hơn ngưỡng BẠC.",
      });
    }
    if (v.tierDiamond <= v.tierGold) {
      ctx.addIssue({
        code: "custom",
        path: ["tierDiamond"],
        message: "Ngưỡng KIM CƯƠNG phải cao hơn ngưỡng VÀNG.",
      });
    }
    // Tắt hết phương thức thanh toán là khoá luôn cửa hàng.
    if (!v.payCod && !v.payBank) {
      ctx.addIssue({
        code: "custom",
        path: ["payCod"],
        message: "Phải bật ít nhất một phương thức thanh toán, nếu không khách không đặt được đơn.",
      });
    }
  });

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function updateSettings(input: SettingsInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      ...input,
      payCod: Boolean(input.payCod),
      payBank: Boolean(input.payBank),
    },
    select: { id: true },
  });
}

/**
 * Đặt hoặc gỡ ảnh QR chuyển khoản.
 *
 * Ảnh lưu trong DB như ảnh sản phẩm (M4.5), nên dọn blob cũ phải đi qua đúng
 * điều kiện "không còn ai dùng": blob được **chia sẻ theo checksum**, và tấm QR
 * cũ hoàn toàn có thể đang là ảnh của một sản phẩm nào đó. Xoá theo id là làm
 * hỏng ảnh không liên quan.
 */
export async function setQrImage(input: { url: string; blobId: string } | null) {
  const cu = await db.storeSetting.findUnique({
    where: { id: ID },
    select: { qrBlobId: true },
  });

  await db.storeSetting.update({
    where: { id: ID },
    data: { qrUrl: input?.url ?? null, qrBlobId: input?.blobId ?? null },
  });

  const boDi = cu?.qrBlobId;
  if (boDi && boDi !== input?.blobId) {
    await db.productImageBlob.deleteMany({
      where: {
        id: boDi,
        images: { none: {} },
        // Không phải QR của chính cài đặt nữa (đã ghi đè ở trên, nhưng kiểm cho chắc).
        NOT: { id: input?.blobId ?? "" },
      },
    });
  }
}
