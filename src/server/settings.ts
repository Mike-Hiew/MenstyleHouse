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

/*
 * Field khai **một lần** ở đây rồi ghép lại thành từng schema.
 *
 * Màn Cài đặt chia thành bốn trang con, mỗi trang lưu riêng, nên mỗi trang cần
 * một schema riêng. Chép tay bốn bản là bốn chỗ để quên đồng bộ khi đổi một
 * ràng buộc; ghép từ cùng một nguồn thì không có chuyện đó.
 */
const cuaHangFields = {
  shopName: z.string().trim().min(2, "Nhập tên cửa hàng").max(120),
  taxCode: z
    .string()
    .trim()
    .regex(/^\d{10}(-\d{3})?$/, "Mã số thuế gồm 10 số, chi nhánh thêm -xxx"),
  address: z.string().trim().min(5, "Nhập địa chỉ").max(200),
  hotline: z.string().trim().min(4, "Nhập hotline").max(30),
  email: z.string().trim().email("Email không hợp lệ"),
};

const thanhToanFields = {
  bankName: z.string().trim().min(2, "Nhập tên ngân hàng").max(80),
  bankAccount: z.string().trim().min(4, "Nhập số tài khoản").max(40),
  bankOwner: z.string().trim().min(2, "Nhập chủ tài khoản").max(120),
  payCod: z.coerce.boolean().optional(),
  payBank: z.coerce.boolean().optional(),
};

const vanChuyenFields = {
  shipInnerCity: tien(1_000_000),
  shipProvince: tien(1_000_000),
  freeShipFrom: tien(),
  vatRate: z.coerce.number().int().min(0, "Thuế suất từ 0").max(20, "Thuế suất tối đa 20%"),
  holdMinutes: z.coerce
    .number()
    .int()
    .min(15, "Giữ đơn tối thiểu 15 phút")
    .max(60 * 24 * 7, "Giữ đơn tối đa 7 ngày"),
};

const thanThietFields = {
  redeemEnabled: z.coerce.boolean().optional(),
  pointValue: z.coerce.number().int().min(1, "1 điểm phải đổi được ít nhất 1 ₫").max(100_000),
  redeemMaxPct: z.coerce.number().int().min(1, "Trần tối thiểu 1%").max(100, "Trần tối đa 100%"),
  tiersEnabled: z.coerce.boolean().optional(),
  tierSilver: tien(),
  tierGold: tien(),
  tierDiamond: tien(),
};

/** Tắt hết phương thức thanh toán là khoá luôn cửa hàng. */
function kiemThanhToan(v: { payCod?: boolean; payBank?: boolean }, ctx: z.RefinementCtx) {
  if (!v.payCod && !v.payBank) {
    ctx.addIssue({
      code: "custom",
      path: ["payCod"],
      message: "Phải bật ít nhất một phương thức thanh toán, nếu không khách không đặt được đơn.",
    });
  }
}

/**
 * Ngưỡng phải tăng dần. Đặt VÀNG thấp hơn BẠC thì hàm phân hạng vẫn chạy nhưng
 * hạng VÀNG không bao giờ với tới được — hỏng im lặng, và chỉ lộ ra khi khách
 * gọi lên hỏi vì sao mãi không lên hạng.
 */
function kiemHang(
  v: { tiersEnabled?: boolean; tierSilver: number; tierGold: number; tierDiamond: number },
  ctx: z.RefinementCtx,
) {
  // Tắt chương trình hạng thì ba con số kia không còn ý nghĩa gì; bắt chúng
  // tăng dần lúc đó chỉ chặn người ta lưu cài đặt vì một lỗi không tồn tại.
  if (!v.tiersEnabled) return;

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
}

/*
 * Mỗi phép kiểm chéo đi theo đúng trang chứa field của nó: ngưỡng hạng nằm ở
 * trang Khách thân thiết, ràng buộc thanh toán nằm ở trang Thanh toán. Nhờ vậy
 * lỗi hiện ra ngay tại trang gây ra nó, thay vì ở một tab khác không ai mở.
 */
export const cuaHangSchema = z.object(cuaHangFields);
export const thanhToanSchema = z.object(thanhToanFields).superRefine(kiemThanhToan);
export const vanChuyenSchema = z.object(vanChuyenFields);
export const thanThietSchema = z.object(thanThietFields).superRefine(kiemHang);

/**
 * Toàn bộ cài đặt trong một object.
 *
 * Không còn form nào gửi cả bốn nhóm cùng lúc, nhưng giữ lại vì đây là chỗ khai
 * đầy đủ hình dạng dữ liệu — `updateSettings` và các bộ kiểm thử dựa vào nó.
 */
export const settingsSchema = z
  .object({ ...cuaHangFields, ...thanhToanFields, ...vanChuyenFields, ...thanThietFields })
  .superRefine((v, ctx) => {
    kiemHang(v, ctx);
    kiemThanhToan(v, ctx);
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
export type CuaHangInput = z.infer<typeof cuaHangSchema>;
export type ThanhToanInput = z.infer<typeof thanhToanSchema>;
export type VanChuyenInput = z.infer<typeof vanChuyenSchema>;
export type ThanThietInput = z.infer<typeof thanThietSchema>;

export async function updateSettings(input: SettingsInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      ...input,
      /*
       * Ba ô tick phải ép về boolean **rõ ràng**. Bỏ tick thì trường vắng mặt
       * trong FormData nên Zod cho ra `undefined`, mà Prisma **bỏ qua** field
       * `undefined` — cờ giữ nguyên giá trị cũ và người dùng tắt mãi không được,
       * không có lỗi nào hiện ra.
       */
      tiersEnabled: Boolean(input.tiersEnabled),
      redeemEnabled: Boolean(input.redeemEnabled),
      payCod: Boolean(input.payCod),
      payBank: Boolean(input.payBank),
    },
    select: { id: true },
  });
}

/* ── Lưu theo từng trang con ──────────────────────────────── */
/*
 * Bốn hàm dưới đây **liệt kê thẳng field của mình** thay vì spread cả input.
 * Spread thì một trang lỡ mang theo field của trang khác sẽ ghi đè âm thầm; liệt
 * kê ra thì mỗi trang chỉ đụng đúng phần của nó, đọc là biết ngay đụng những gì.
 *
 * Cờ boolean vẫn phải ép `Boolean()` vì lý do đã ghi ở `updateSettings`, và mỗi
 * cờ chỉ xuất hiện ở đúng trang có ô tick của nó — trang khác không được phép
 * chạm vào, nếu không lưu trang Cửa hàng lại tắt mất phương thức thanh toán.
 */

export async function luuCuaHang(input: CuaHangInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      shopName: input.shopName,
      taxCode: input.taxCode,
      address: input.address,
      hotline: input.hotline,
      email: input.email,
    },
    select: { id: true },
  });
}

export async function luuThanhToan(input: ThanhToanInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      bankName: input.bankName,
      bankAccount: input.bankAccount,
      bankOwner: input.bankOwner,
      payCod: Boolean(input.payCod),
      payBank: Boolean(input.payBank),
    },
    select: { id: true },
  });
}

export async function luuVanChuyen(input: VanChuyenInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      shipInnerCity: input.shipInnerCity,
      shipProvince: input.shipProvince,
      freeShipFrom: input.freeShipFrom,
      vatRate: input.vatRate,
      holdMinutes: input.holdMinutes,
    },
    select: { id: true },
  });
}

export async function luuThanThiet(input: ThanThietInput) {
  return db.storeSetting.update({
    where: { id: ID },
    data: {
      redeemEnabled: Boolean(input.redeemEnabled),
      pointValue: input.pointValue,
      redeemMaxPct: input.redeemMaxPct,
      tiersEnabled: Boolean(input.tiersEnabled),
      tierSilver: input.tierSilver,
      tierGold: input.tierGold,
      tierDiamond: input.tierDiamond,
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
