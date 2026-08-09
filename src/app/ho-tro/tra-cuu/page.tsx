import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { Badge } from "@/components/ui/badge";
import { getTicketByCode } from "@/server/tickets";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { rateLimit } from "@/server/rate-limit";
import { TicketReply } from "@/components/storefront/ticket-reply";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tra cứu yêu cầu hỗ trợ — Men Style House",
  robots: { index: false, follow: false },
};

const TONE: Record<string, "ok" | "warn" | "neutral"> = {
  OPEN: "warn",
  PENDING: "warn",
  RESOLVED: "ok",
  CLOSED: "neutral",
};

/**
 * Khách tra yêu cầu hỗ trợ bằng mã.
 *
 * Trước M6.16, gửi xong khách nhận mã `TIC-2026-00007` rồi **không có trang nào
 * để xem lại** — `getTicketByCode` đã viết sẵn mà không màn nào gọi tới. Trả lời
 * của cửa hàng đi qua email; ai không nhận được mail thì mất hút.
 *
 * Không cần đăng nhập, giống tra cứu đơn. Bù lại **chặn theo IP**: mã yêu cầu
 * chạy tuần tự nên không giới hạn là ai cũng dò được nội dung trao đổi của
 * người khác chỉ bằng cách đếm lên.
 */
export default async function TicketLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ ma?: string }>;
}) {
  const ma = ((await searchParams).ma ?? "").trim();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const chan = ma !== "" && !(await rateLimit("tra-ho-tro:" + ip, 20, 60 * 60 * 1000)).ok;

  const yc = ma !== "" && !chan ? await getTicketByCode(ma) : null;

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "HỖ TRỢ", "TRA CỨU"]} />
          <h1 className="mb-3 text-[28px] lg:text-[40px]">Tra cứu yêu cầu hỗ trợ</h1>
          <p className="mb-7 max-w-[520px] text-[14px] leading-[1.7] text-muted">
            Nhập mã yêu cầu cửa hàng đã gửi cho bạn (dạng{" "}
            <span className="font-mono">TIC-2026-00007</span>). Không cần đăng nhập.
          </p>

          <form method="get" className="mb-8 flex max-w-[520px] flex-wrap gap-2.5">
            <input
              name="ma"
              defaultValue={ma}
              aria-label="Mã yêu cầu hỗ trợ"
              placeholder="TIC-2026-00007"
              className="h-12 min-w-0 flex-1 border-2 border-divider bg-surface px-3.5 font-mono text-[16px] lg:text-[14px]"
            />
            <button
              type="submit"
              className="h-12 flex-none bg-accent px-6 text-[14px] font-extrabold text-bg"
            >
              TÌM
            </button>
          </form>

          {chan ? (
            <p role="alert" className="max-w-[520px] border-2 border-accent bg-accent-100 px-5 py-5 text-[14px] font-semibold text-accent-800">
              Bạn đã tra khá nhiều lần. Thử lại sau một giờ, hoặc gọi 1900 6060.
            </p>
          ) : null}

          {ma !== "" && !chan && !yc ? (
            <div className="max-w-[520px] border border-dashed border-border-soft bg-subtle px-5 py-8">
              <h2 className="mb-2 text-[18px]">Không tìm thấy yêu cầu nào</h2>
              <p className="text-[14px] text-muted">
                Kiểm tra lại mã giúp nhé. Chưa gửi yêu cầu bao giờ?{" "}
                <Link href="/ho-tro" className="font-semibold underline">
                  Gửi yêu cầu mới
                </Link>
                .
              </p>
            </div>
          ) : null}

          {yc ? (
            <article>
              <div className="mb-5 flex flex-wrap items-center gap-3 border-b-2 border-divider pb-3">
                <h2 className="font-mono text-[18px] font-extrabold">{yc.code}</h2>
                <Badge tone={TONE[yc.status] ?? "neutral"}>
                  {TICKET_STATUS_LABEL[yc.status] ?? yc.status}
                </Badge>
                <span className="label-tech ml-auto">{formatDateTime(yc.createdAt)}</span>
              </div>

              <p className="mb-1 text-[17px] font-extrabold">{yc.subject}</p>
              {yc.orderCode ? (
                <p className="mb-5 text-[13.5px] text-muted">
                  Về đơn <span className="font-mono">{yc.orderCode}</span>
                </p>
              ) : null}

              <ol className="flex flex-col gap-3">
                {yc.messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      "border-2 p-4 " +
                      (m.isStaff ? "border-divider bg-subtle" : "border-hairline bg-surface")
                    }
                  >
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
                      <span className="text-[13.5px] font-extrabold">
                        {m.isStaff ? "Cửa hàng" : m.authorName}
                      </span>
                      <span className="label-tech">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7]">{m.body}</p>
                  </li>
                ))}
              </ol>

              <TicketReply code={yc.code} daDong={yc.status === "CLOSED"} />
            </article>
          ) : null}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
