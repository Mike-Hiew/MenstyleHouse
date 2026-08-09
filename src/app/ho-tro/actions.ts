"use server";

import { headers } from "next/headers";
import { docIpKhach } from "@/lib/client-ip";
import { createTicket, ticketSchema } from "@/server/tickets";
import { rateLimit } from "@/server/rate-limit";

export type SupportState = {
  ok?: boolean;
  code?: string;
  message?: string;
  errors?: Record<string, string>;
  /** Trả lại những gì khách vừa gõ — React 19 tự reset form sau mỗi action. */
  values?: Record<string, string>;
};

function daNhap(form: FormData): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") ra[k] = v;
  return ra;
}

/**
 * Nhận yêu cầu hỗ trợ từ form liên hệ.
 *
 * Có giới hạn tần suất theo IP: form này gửi được mà **không cần đăng nhập**,
 * nên nó là chỗ dễ bị dội nhất trên storefront.
 */
export async function submitTicketAction(
  _prev: SupportState,
  form: FormData,
): Promise<SupportState> {
  const parsed = ticketSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, message: "Kiểm tra lại các ô được đánh dấu.", values: daNhap(form) };
  }

  const ip = docIpKhach(await headers());
  if (!(await rateLimit("ticket:" + ip, 5, 60 * 60 * 1000)).ok) {
    return {
      ok: false,
      message: "Bạn đã gửi khá nhiều yêu cầu. Thử lại sau một giờ hoặc gọi 1900 6060.",
      values: daNhap(form),
    };
  }

  try {
    const { currentUserId } = await import("@/auth");
    const userId = await currentUserId();
    const t = await createTicket(parsed.data, userId);
    return { ok: true, code: t.code, message: "Đã nhận yêu cầu của bạn." };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      message: "Không gửi được yêu cầu. Bạn thử lại hoặc gọi 1900 6060.",
      values: daNhap(form),
    };
  }
}
