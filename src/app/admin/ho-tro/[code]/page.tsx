import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TicketThread } from "@/components/admin/ticket-thread";
import { requirePermission } from "@/server/admin/guard";
import { getTicket } from "@/server/admin/tickets";
import { TICKET_STATUS_LABEL } from "@/server/tickets";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({ params }: { params: Promise<{ code: string }> }) {
  await requirePermission("ho-tro.tra-loi");

  const { code } = await params;
  const t = await getTicket(decodeURIComponent(code));
  if (!t) notFound();

  return (
    <div>
      <Link
        href="/admin/ho-tro"
        className="mb-3.5 inline-flex min-h-11 items-center text-[12.5px] font-extrabold text-accent"
      >
        ← QUAY LẠI HỖ TRỢ
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="font-mono text-[26px] font-bold lg:text-[34px]">{t.code}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {t.subject} · gửi lúc {formatDateTime(t.createdAt)}
          </p>
        </div>
        <Badge tone={t.status === "CLOSED" ? "neutral" : t.status === "RESOLVED" ? "ok" : "warn"}>
          {TICKET_STATUS_LABEL[t.status].toUpperCase()}
        </Badge>
      </div>

      <div className="grid items-start gap-7 lg:grid-cols-[1fr_300px]">
        <TicketThread code={t.code} status={t.status} messages={t.messages} />

        <aside className="border-2 border-border-soft p-5">
          <p className="label-tech mb-2 font-bold">THÔNG TIN</p>
          <dl className="flex flex-col gap-2.5 text-[13.5px]">
            <div>
              <dt className="text-muted">Kênh gửi</dt>
              <dd className="font-semibold">{t.channel === "web" ? "Form liên hệ" : t.channel}</dd>
            </div>
            {t.orderCode ? (
              <div>
                <dt className="text-muted">Đơn liên quan</dt>
                <dd>
                  <Link
                    href={("/admin/don-hang/" + t.orderCode) as Route}
                    className="font-mono font-semibold underline"
                  >
                    {t.orderCode}
                  </Link>
                  <p className="mt-1 text-[12px] text-faint">Mã do khách tự khai, có thể sai.</p>
                </dd>
              </div>
            ) : null}
            {t.user ? (
              <div className="border-t border-hairline pt-2.5">
                <dt className="text-muted">Tài khoản</dt>
                <dd className="font-semibold">{t.user.name}</dd>
                {t.user.phone ? (
                  <dd className="font-mono text-[12.5px] text-muted">{t.user.phone}</dd>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-hairline pt-2.5">
                <dt className="text-muted">Tài khoản</dt>
                <dd className="text-[13px] text-faint">Khách vãng lai</dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
