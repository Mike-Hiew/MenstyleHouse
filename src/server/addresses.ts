import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

/**
 * Sổ địa chỉ của thành viên. `docs/API.md`: listAddresses / saveAddress /
 * deleteAddress / setDefaultAddress.
 *
 * Lưu ý luật số 3: `Order` **snapshot** địa chỉ chứ không tham chiếu bản ghi
 * này — sửa địa chỉ ở đây không được làm đổi đơn cũ.
 */

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Đặt tên cho địa chỉ").max(40),
  receiver: z.string().trim().min(2, "Nhập tên người nhận").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Số điện thoại phải có 10 số và bắt đầu bằng 0"),
  province: z.string().trim().min(1, "Chọn tỉnh/thành phố"),
  district: z.string().trim().min(1, "Nhập quận/huyện"),
  ward: z.string().trim().min(1, "Nhập phường/xã"),
  street: z.string().trim().min(4, "Nhập địa chỉ cụ thể").max(200),
  isDefault: z.coerce.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export async function listAddresses(userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
}

/** Đặt mặc định là thao tác độc quyền: bật cái này thì tắt hết cái khác. */
async function clearOtherDefaults(userId: string, keepId?: string) {
  await db.address.updateMany({
    where: { userId, isDefault: true, ...(keepId ? { id: { not: keepId } } : {}) },
    data: { isDefault: false },
  });
}

export async function saveAddress(userId: string, input: AddressInput, id?: string) {
  const first = (await db.address.count({ where: { userId } })) === 0;
  const isDefault = input.isDefault || first;

  const saved = id
    ? await db.address.update({ where: { id }, data: { ...input, isDefault } })
    : await db.address.create({ data: { ...input, isDefault, userId } });

  if (isDefault) await clearOtherDefaults(userId, saved.id);
  return saved;
}

export async function deleteAddress(userId: string, id: string) {
  // Chỉ xoá địa chỉ của chính mình — không tin id từ client.
  const addr = await db.address.findFirst({ where: { id, userId }, select: { id: true, isDefault: true } });
  if (!addr) return;

  await db.address.delete({ where: { id: addr.id } });

  // Xoá mất cái mặc định thì đôn cái còn lại lên, tránh sổ không có mặc định.
  if (addr.isDefault) {
    const next = await db.address.findFirst({ where: { userId }, orderBy: { id: "asc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}

export async function setDefaultAddress(userId: string, id: string) {
  const addr = await db.address.findFirst({ where: { id, userId }, select: { id: true } });
  if (!addr) return;
  await db.address.update({ where: { id: addr.id }, data: { isDefault: true } });
  await clearOtherDefaults(userId, addr.id);
}
