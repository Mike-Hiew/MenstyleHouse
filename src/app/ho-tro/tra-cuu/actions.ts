"use server";

import { headers } from "next/headers";
import { docIpKhach } from "@/lib/client-ip";
import { revalidatePath } from "next/cache";
import {
  danhGiaSchema,
  danhGiaTicket,
  DanhGiaError,
  traLoiSchema,
  traLoiTicket,
  TicketClosedError,
} from "@/server/tickets";
import { rateLimit } from "@/server/rate-limit";

export type TraLoiState = { ok?: boolean; message?: string; errors?: Record<string, string> };

/** Khách nhắn tiếp trong cùng yêu cầu. Không cần đăng nhập, nên chặn theo IP. */
export async function traLoiAction(_prev: TraLoiState, form: FormData): Promise<TraLoiState> {
  const parsed = traLoiSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !errors[k]) errors[k] = i.message;
    }
    return { ok: false, errors, message: "Kiểm tra lại các ô được đánh dấu." };
  }

  const ip = docIpKhach(await headers());
  if (!(await rateLimit("tra-loi-ho-tro:" + ip, 15, 60 * 60 * 1000)).ok) {
    return { ok: false, message: "Bạn gửi khá nhiều rồi. Thử lại sau một giờ nhé." };
  }

  try {
    const ket = await traLoiTicket(parsed.data);
    if (!ket) return { ok: false, message: "Không tìm thấy yêu cầu này." };
  } catch (e) {
    if (e instanceof TicketClosedError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Chưa gửi được. Bạn thử lại giúp." };
  }

  revalidatePath("/ho-tro/tra-cuu");
  return { ok: true, message: "Đã gửi. Cửa hàng sẽ trả lời trong giờ hành chính." };
}

export type DanhGiaState = { ok?: boolean; message?: string };

/** Khách chấm mức hài lòng. Không cần đăng nhập — chặn theo IP như nhắn tiếp. */
export async function danhGiaAction(_prev: DanhGiaState, form: FormData): Promise<DanhGiaState> {
  const parsed = danhGiaSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Kiểm tra lại giúp." };
  }

  const ip = docIpKhach(await headers());
  if (!(await rateLimit("danh-gia-ho-tro:" + ip, 10, 60 * 60 * 1000)).ok) {
    return { ok: false, message: "Bạn gửi khá nhiều rồi. Thử lại sau một giờ nhé." };
  }

  try {
    const ket = await danhGiaTicket(parsed.data);
    if (!ket) return { ok: false, message: "Không tìm thấy yêu cầu này." };
  } catch (e) {
    if (e instanceof DanhGiaError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Chưa gửi được. Bạn thử lại giúp." };
  }

  revalidatePath("/ho-tro/tra-cuu");
  return { ok: true, message: "Cảm ơn bạn đã đánh giá!" };
}
