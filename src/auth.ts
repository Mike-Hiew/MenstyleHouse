import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { phienConSong } from "@/lib/session";

/**
 * Auth.js v5, chỉ credentials. OTP thuộc M7 theo `docs/BUILD-PLAN.md` nên chưa
 * nối ở đây.
 *
 * Đăng nhập bằng **số điện thoại hoặc email**: khách tự đăng ký có số, còn nhân
 * viên được mời qua email thì không có số nào cả. Chỉ nhận số là mời người ta
 * vào rồi khoá cửa không cho vào.
 *
 * **Đăng nhập không bao giờ bắt buộc** — khách vãng lai mua được toàn bộ luồng.
 * Session dùng JWT để không phải thêm bảng session vào schema.
 */

const credentialsSchema = z.object({
  /** Số điện thoại 10 số, hoặc email. */
  phone: z.string().trim().min(5).max(120),
  password: z.string().min(6),
});

const laSoDienThoai = (v: string) => /^0\d{9}$/.test(v);

/**
 * Trạng thái quyết định phiên còn sống hay không, đọc lại từ DB.
 *
 * Chạy ở **mọi lượt đọc phiên**, nên bọc `cache()` để một request chỉ tra một
 * lần dù có bao nhiêu chỗ gọi `auth()`. Đây là cái giá phải trả để tắt được tài
 * khoản và thu hồi được phiên: tin vào JWT thì rẻ hơn, nhưng lệnh tắt của quản
 * trị sẽ chỉ có tác dụng sau khi token hết hạn.
 */
const docTrangThaiPhien = cache(async (userId: string) =>
  db.user.findUnique({
    where: { id: userId },
    select: {
      active: true,
      sessionsValidFrom: true,
      role: true,
      // Cờ nhân viên phải đi vào token cho middleware — xem ghi chú ở `jwt()`.
      roleRef: { select: { isStaff: true } },
    },
  }),
);

/*
 * Không có `AUTH_SECRET` thì **dừng ngay lúc khởi động**, không chạy tiếp với
 * một khoá mặc định. Chạy tiếp là mọi phiên đăng nhập ký bằng một khoá ai cũng
 * đoán được, và không có gì báo cho ai biết.
 */
if (!process.env.AUTH_SECRET?.trim()) {
  throw new Error(
    "Thiếu AUTH_SECRET. Sinh bằng: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/dang-nhap" },
  providers: [
    Credentials({
      credentials: { phone: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const dinhDanh = parsed.data.phone;
        const kem = { include: { roleRef: { select: { isStaff: true } } } } as const;
        const user = laSoDienThoai(dinhDanh)
          ? await db.user.findUnique({ where: { phone: dinhDanh }, ...kem })
          : await db.user.findUnique({ where: { email: dinhDanh.toLowerCase() }, ...kem });
        if (!user?.passwordHash) return null;

        // Tài khoản đã tắt thì không vào được, dù mật khẩu vẫn đúng.
        if (!user.active) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role,
          staff: user.roleRef.isStaff,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Vừa đăng nhập xong: token chưa có `iat`, và cũng chẳng cần kiểm gì —
      // `authorize` vừa đọc thẳng từ DB xong.
      if (user?.id) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.staff = (user as { staff?: boolean }).staff ?? false;
        return token;
      }
      if (!token.uid) return token;

      const u = await docTrangThaiPhien(String(token.uid));
      // Không còn dòng nào: tài khoản đã bị xoá — phiên phải chết theo.
      if (!u || !phienConSong(u, token.iat)) return null;

      // Đổi vai trò có hiệu lực ngay lượt tải trang kế tiếp, không đợi hết hạn.
      token.role = u.role;
      /*
       * Cờ "có phải nhân viên không" đi kèm vai trò vào token, vì `middleware.ts`
       * chạy trên Edge và **không đọc được DB** — nó chỉ có mỗi token để quyết
       * định cho qua `/admin` hay không. Từ khi vai trò là dữ liệu, một danh sách
       * viết cứng trong middleware không còn biết `TRUONG_CA` là nhân viên.
       *
       * Đọc lại từ DB mỗi lượt như `role`, nên chuyển một vai trò từ nhân viên
       * thành không phải nhân viên có tác dụng ngay lượt tải trang kế tiếp.
       */
      token.staff = u.roleRef.isStaff;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      session.user.role = (token.role as string) ?? "CUSTOMER";
      return session;
    },
  },
});

/** Id người dùng hiện tại, hoặc null nếu là khách vãng lai. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Khoá vai trò hiện tại; khách vãng lai coi như CUSTOMER. */
export async function currentRole(): Promise<string> {
  const session = await auth();
  return session?.user?.role ?? "CUSTOMER";
}
