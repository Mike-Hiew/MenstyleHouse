"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { submitTicketAction, type SupportState } from "@/app/ho-tro/actions";

/**
 * Form liên hệ ở storefront.
 *
 * **Mockup không thiết kế màn này** — 12 màn storefront trong mockup không có
 * màn liên hệ, nhưng footer có ba link trỏ về `/ho-tro` và màn Hỗ trợ bên admin
 * lại ghi "yêu cầu từ form liên hệ". Nên form này tôi tự dựng, bám đúng ngôn
 * ngữ thiết kế đang dùng: viền 2px, không bo góc, nhãn mono.
 *
 * Gửi xong hiện **mã yêu cầu** thay vì chỉ nói "đã gửi": khách cần một thứ cầm
 * theo để hỏi lại, giống mã đơn ở trang cảm ơn.
 */
export function SupportForm() {
  const [state, submit, pending] = useActionState<SupportState, FormData>(submitTicketAction, {});

  const cu = (n: string) => state.values?.[n];
  const lan = React.useMemo(() => JSON.stringify(state.values ?? null), [state.values]);
  const err = (n: string) => state.errors?.[n];

  if (state.ok && state.code) {
    return (
      <div className="border-2 border-divider bg-surface p-8">
        <div className="mb-5 grid h-14 w-14 place-items-center bg-neutral-900 text-[28px] font-extrabold text-bg">
          ✓
        </div>
        <h2 className="mb-3 text-[28px] leading-[1.15]">Đã nhận yêu cầu của bạn</h2>
        <p className="mb-2 text-[15px] text-muted">
          Mã yêu cầu của bạn là{" "}
          <strong className="font-mono text-[17px] text-text">{state.code}</strong>. Giữ mã này để
          hỏi lại khi cần.
        </p>
        <p className="mb-7 text-[15px] text-muted">
          Cửa hàng trả lời trong giờ hành chính, thường trong vòng một ngày làm việc. Việc gấp thì
          gọi <strong className="text-text">1900 6060</strong>.
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Đưa thẳng khách tới trang tra cứu kèm mã — không bắt họ tự chép. */}
          <Link
            href={("/ho-tro/tra-cuu?ma=" + state.code) as Route}
            className="flex min-h-12 items-center bg-accent px-6 text-[14px] font-extrabold text-bg"
          >
            THEO DÕI YÊU CẦU
          </Link>
          <Link
            href={{ pathname: "/san-pham" }}
            className="flex min-h-12 items-center bg-neutral-900 px-6 text-[14px] font-extrabold text-bg"
          >
            TIẾP TỤC MUA SẮM
          </Link>
          <Link
            href={{ pathname: "/tra-cuu-don" }}
            className="flex min-h-12 items-center border border-border-soft px-6 text-[14px] font-extrabold"
          >
            Tra cứu đơn hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={submit} className="max-w-[680px]">
      {state.message ? (
        <p
          role="alert"
          className="mb-5 border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Row label="Tên của bạn" error={err("name")}>
          <input
            name="name"
            key={"n" + lan}
            defaultValue={cu("name") ?? ""}
            placeholder="Nguyễn Văn A"
            className={o(err("name"))}
          />
        </Row>

        <Row label="Email hoặc số điện thoại" error={err("contact")}>
          <input
            name="contact"
            key={"c" + lan}
            defaultValue={cu("contact") ?? ""}
            placeholder="0903 128 447"
            className={o(err("contact"))}
          />
        </Row>

        <Row label="Mã đơn hàng" hint="Không bắt buộc" error={err("orderCode")}>
          <input
            name="orderCode"
            key={"o" + lan}
            defaultValue={cu("orderCode") ?? ""}
            placeholder="MSH-2026-00058"
            className={cn(o(err("orderCode")), "font-mono")}
          />
        </Row>

        <Row label="Vấn đề cần hỗ trợ" error={err("subject")}>
          <input
            name="subject"
            key={"s" + lan}
            defaultValue={cu("subject") ?? ""}
            placeholder="Đổi size áo đã đặt"
            className={o(err("subject"))}
          />
        </Row>

        <div className="sm:col-span-2">
          <Row label="Mô tả chi tiết" error={err("body")}>
            <textarea
              name="body"
              rows={6}
              key={"b" + lan}
              defaultValue={cu("body") ?? ""}
              placeholder="Kể rõ tình trạng để cửa hàng xử lý được ngay từ lần trả lời đầu tiên."
              className={o(err("body"))}
            />
          </Row>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 h-12 w-full bg-accent text-[14px] font-extrabold text-bg disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pending ? "Đang gửi…" : "GỬI YÊU CẦU"}
      </button>
    </form>
  );
}

const o = (loi?: string) =>
  cn(
    "w-full border bg-bg px-3.5 py-3 text-[16px] outline-none lg:text-[14px]",
    loi ? "border-accent" : "border-border-soft focus:border-accent",
  );

function Row({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">
        {label}
        {hint ? <span className="ml-1.5 font-normal text-faint">({hint})</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-accent-800">{error}</span> : null}
    </label>
  );
}
