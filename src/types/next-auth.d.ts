import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** `role` là **khoá** vai trò, không phải cả hàng — xem `model Role`. */
    user: { id: string; role: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    /**
     * Vai trò này có vào được khu quản trị không.
     *
     * Nằm trong token vì `middleware.ts` chạy trên Edge và không đọc được DB.
     * Token cũ phát trước M6.22 không có trường này — middleware coi `undefined`
     * là chưa biết và đá về đăng nhập, tức hỏng theo hướng khoá cửa.
     */
    staff?: boolean;
  }
}
