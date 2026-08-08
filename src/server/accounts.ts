import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { pointsFor } from "@/lib/money";

/**
 * Tài khoản thành viên. Đăng ký **không bắt buộc** — chỉ để tích điểm, lưu sổ
 * địa chỉ và xem lại đơn cũ.
 */

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nhập họ tên").max(80),
    phone: z
      .string()
      .trim()
      .regex(/^0\d{9}$/, "Số điện thoại phải có 10 số và bắt đầu bằng 0"),
    email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
    password2: z.string(),
  })
  /*
   * Bắt nhập lại mật khẩu, và kiểm ở **server** chứ không chỉ ngoài trình duyệt.
   * Gõ lệch một ký tự mà vẫn tạo được tài khoản là khách khoá mình ra khỏi tài
   * khoản ngay từ ngày đầu — không đăng nhập lại được, mà cũng không biết vì sao.
   */
  .superRefine((v, ctx) => {
    if (v.password !== v.password2) {
      ctx.addIssue({
        code: "custom",
        path: ["password2"],
        message: "Hai lần nhập mật khẩu không khớp",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export class PhoneTakenError extends Error {
  constructor() {
    super("Số điện thoại này đã có tài khoản. Bạn đăng nhập nhé.");
    this.name = "PhoneTakenError";
  }
}

/** Quà đăng ký, đúng con số ghi trên popup mời đăng ký của mockup. */
export const SIGNUP_BONUS = 100;

export async function registerUser(input: RegisterInput): Promise<{ userId: string }> {
  const taken = await db.user.findUnique({ where: { phone: input.phone }, select: { id: true } });
  if (taken) throw new PhoneTakenError();

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        passwordHash,
        role: "CUSTOMER",
        pointBalance: SIGNUP_BONUS,
      },
      select: { id: true },
    });

    // Mọi thay đổi điểm đều để lại một dòng sổ, không sửa số dư trần trụi.
    await tx.pointEntry.create({
      data: {
        userId: created.id,
        delta: SIGNUP_BONUS,
        reason: "ADJUST",
        note: "Quà đăng ký thành viên",
      },
    });

    return created;
  });

  return { userId: user.id };
}

/**
 * Ghi điểm cho đơn. Theo `docs/CLAUDE-rules.md`: **chỉ khi đơn `PAID` và
 * `DELIVERED`**, và chỉ ghi một lần cho mỗi đơn.
 */
export async function awardPointsForOrder(orderCode: string): Promise<number> {
  const order = await db.order.findUnique({
    where: { code: orderCode },
    select: {
      id: true,
      userId: true,
      total: true,
      status: true,
      paymentStatus: true,
      pointsEarned: true,
    },
  });

  if (!order?.userId) return 0;
  if (order.status !== "DELIVERED" || order.paymentStatus !== "PAID") return 0;
  if (order.pointsEarned > 0) return order.pointsEarned;

  const points = pointsFor(order.total);
  if (points <= 0) return 0;

  await db.$transaction(async (tx) => {
    await tx.pointEntry.create({
      data: {
        userId: order.userId!,
        delta: points,
        reason: "EARN_ORDER",
        orderId: order.id,
        note: "Đơn " + orderCode,
      },
    });
    await tx.user.update({
      where: { id: order.userId! },
      data: { pointBalance: { increment: points } },
    });
    await tx.order.update({ where: { id: order.id }, data: { pointsEarned: points } });
  });

  return points;
}

export async function getPointSummary(userId: string) {
  const [user, entries] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, pointBalance: true } }),
    db.pointEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return { balance: user?.pointBalance ?? 0, name: user?.name ?? "", entries };
}

/* ── Hồ sơ của chính mình ─────────────────────────────────── */

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nhập họ tên").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, "Số điện thoại phải có 10 số và bắt đầu bằng 0"),
  email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export class EmailTakenError extends Error {
  constructor() {
    super("Email này đã có tài khoản khác dùng.");
    this.name = "EmailTakenError";
  }
}

/**
 * Sửa hồ sơ. Số điện thoại và email là **khoá đăng nhập**, nên đổi trùng người
 * khác không chỉ hỏng dữ liệu mà còn cướp mất đường vào của họ — chặn trước.
 */
export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  const email = input.email?.trim().toLowerCase() || null;

  const trungSo = await db.user.findFirst({
    where: { phone: input.phone, id: { not: userId } },
    select: { id: true },
  });
  if (trungSo) throw new PhoneTakenError();

  if (email) {
    const trungMail = await db.user.findFirst({
      where: { email, id: { not: userId } },
      select: { id: true },
    });
    if (trungMail) throw new EmailTakenError();
  }

  await db.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone, email },
  });
}

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Nhập mật khẩu hiện tại"),
  password: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(72),
  password2: z.string(),
});

export class WrongPasswordError extends Error {
  constructor() {
    super("Mật khẩu hiện tại không đúng.");
    this.name = "WrongPasswordError";
  }
}

/**
 * Đổi mật khẩu khi **đang đăng nhập**.
 *
 * Bắt nhập lại mật khẩu hiện tại: không hỏi thì ai mượn được máy đang mở sẵn
 * phiên là đổi mật khẩu và chiếm luôn tài khoản.
 *
 * Đổi xong đẩy `sessionsValidFrom` như luồng quên mật khẩu, nên mọi phiên khác
 * chết theo — người ta đổi mật khẩu chính vì nghi có kẻ đang ở trong đó.
 */
export async function changePassword(
  userId: string,
  input: { current: string; password: string },
): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user.passwordHash) throw new WrongPasswordError();

  const dung = await bcrypt.compare(input.current, user.passwordHash);
  if (!dung) throw new WrongPasswordError();

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(input.password, 10),
      sessionsValidFrom: new Date(),
    },
  });
}
