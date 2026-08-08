"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { replyTicketAction, setTicketStatusAction, type AdminActionState } from "@/app/admin/actions";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";

export type ThreadMessage = {
  id: string;
  authorName: string;
  isStaff: boolean;
  body: string;
  createdAt: Date;
};

/**
 * Cuộc trao đổi với khách.
 *
 * Trả lời là **thêm** một tin, không sửa tin cũ. Yêu cầu đã đóng thì ô soạn
 * biến mất — muốn nói tiếp phải mở lại, để lịch sử luôn đọc được theo đúng thứ
 * tự đã xảy ra thay vì có tin chen vào sau khi đã chốt.
 */
export function TicketThread({
  code,
  status,
  messages,
}: {
  code: string;
  status: string;
  messages: ThreadMessage[];
}) {
  const [state, reply, sending] = useActionState<AdminActionState, FormData>(replyTicketAction, {});
  const [stState, doiTrangThai] = useActionState<AdminActionState, FormData>(
    setTicketStatusAction,
    {},
  );

  const notice = state.message ?? stState.message;
  const noticeOk = state.message ? state.ok : stState.ok;
  const daDong = status === "CLOSED";

  return (
    <div>
      {notice ? (
        <p
          role="alert"
          className={cn(
            "mb-5 border-2 px-4 py-3 text-[13.5px] font-semibold",
            noticeOk ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {notice}
        </p>
      ) : null}

      <ol className="mb-6 flex flex-col gap-4">
        {messages.map((m) => (
          <li
            key={m.id}
            className={cn(
              "border-2 p-4",
              m.isStaff ? "ml-0 border-divider bg-subtle sm:ml-12" : "border-border-soft bg-surface",
            )}
          >
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
              <span className="text-[13.5px] font-extrabold">{m.authorName}</span>
              <span className="label-tech">
                {m.isStaff ? "CỬA HÀNG" : "KHÁCH"} · {formatDateTime(m.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[14px] leading-[1.7]">{m.body}</p>
          </li>
        ))}
      </ol>

      {daDong ? (
        <div className="border-2 border-dashed border-border-soft bg-subtle px-4 py-5">
          <p className="mb-3 text-[13.5px] text-muted">
            Yêu cầu đã đóng. Mở lại nếu khách còn vấn đề.
          </p>
          <form action={doiTrangThai}>
            <input type="hidden" name="code" value={code} />
            <input type="hidden" name="status" value="PENDING" />
            <button
              type="submit"
              className="min-h-12 border-2 border-divider px-5 text-[13.5px] font-extrabold"
            >
              MỞ LẠI YÊU CẦU
            </button>
          </form>
        </div>
      ) : (
        <form action={reply} className="border-2 border-border-soft p-4">
          <input type="hidden" name="code" value={code} />
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Trả lời khách</span>
            <textarea
              name="body"
              rows={5}
              required
              placeholder="Chào anh/chị, cửa hàng đã kiểm tra đơn…"
              className="w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold">Chuyển trạng thái</span>
              <select
                name="status"
                defaultValue="RESOLVED"
                className="min-h-12 border border-border-soft bg-bg px-3 text-[14px]"
              >
                {(["PENDING", "RESOLVED", "CLOSED"] as const).map((s) => (
                  <option key={s} value={s}>
                    {TICKET_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={sending}
              className="min-h-12 bg-accent px-6 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
            >
              {sending ? "Đang gửi…" : "GỬI TRẢ LỜI"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
