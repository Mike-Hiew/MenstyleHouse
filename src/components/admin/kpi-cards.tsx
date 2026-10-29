import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";
import { formatVnd } from "@/lib/money";
import { dinhDangThoiGian } from "@/lib/kpi";
import type { Kpi } from "@/server/admin/kpis";
import { CountUp } from "./count-up";

/**
 * Hàng thẻ số liệu dùng chung cho Tổng quan, Khách hàng, Hỗ trợ.
 *
 * Kiểu Glass: thẻ kính, thẻ đầu xanh bạc hà, số chạy, phần so sánh là viên
 * thuốc xanh/đỏ. Kiểu Modernist: một dải bốn ô kẻ nét như bản cũ.
 */
export function KpiCards({ items }: { items: Kpi[] }) {
  const g = FLAGS.adminGlass;

  return (
    <dl
      className={cn(
        "mb-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
        g ? "adm-stagger gap-3" : "border-b-2 border-t-2 border-border-soft",
      )}
    >
      {items.map((k, i) => (
        <div
          key={k.label}
          className={
            g
              ? cn("adm-card px-5 py-[18px]", i === 0 && "adm-card-mint")
              : cn("py-5 pr-6", i < items.length - 1 && "border-b border-hairline xl:border-b-0 xl:border-r")
          }
        >
          <dt className="label-tech font-bold">{k.label}</dt>
          <dd>
            <span
              className={cn(
                "mb-1.5 mt-2.5 block tracking-[-0.025em] tabular-nums",
                g ? "whitespace-nowrap text-[26px] font-semibold" : "text-[26px] font-extrabold lg:text-[30px]",
              )}
            >
              <GiaTri k={k} dem={g} />
            </span>
            <span className="block text-[12.5px] font-extrabold">
              <DongPhu k={k} g={g} />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function GiaTri({ k, dem }: { k: Kpi; dem: boolean }) {
  switch (k.kind) {
    case "percent":
      return <>{k.value}%</>;
    case "duration":
      return <>{k.value ? dinhDangThoiGian(k.value) : "—"}</>;
    default:
      return dem ? (
        <CountUp value={k.value} money={k.kind === "money"} />
      ) : (
        <>{k.kind === "money" ? formatVnd(k.value) : k.value.toLocaleString("vi-VN")}</>
      );
  }
}

function DongPhu({ k, g }: { k: Kpi; g: boolean }) {
  if (k.note !== undefined || k.delta === undefined) {
    return (
      <span
        className={cn(
          "font-normal",
          k.alert ? (g ? "adm-delta down font-semibold" : "font-extrabold text-accent-700") : "text-faint",
        )}
      >
        {k.note}
      </span>
    );
  }
  if (k.delta === null) return <span className="font-normal text-faint">Chưa có kỳ trước để so</span>;

  const tang = k.delta >= 0;
  const tot = k.neutral ? null : tang !== Boolean(k.lowerIsBetter);
  return (
    <span className={cn(g && "adm-delta", g && tot === false && "down", g && tot === null && "neutral")}>
      <span className={g ? undefined : tot === false ? "text-accent-700" : "text-text"}>
        {tang ? "+" : ""}
        {k.delta}%
      </span>{" "}
      <span className="font-normal text-faint">so với kỳ trước</span>
    </span>
  );
}
