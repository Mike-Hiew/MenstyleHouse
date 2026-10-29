import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";

/**
 * Thanh lượt dùng của mã giảm giá (`đã dùng / giới hạn`).
 *
 * Mã không giới hạn lượt thì chỉ ghi số: thanh của một thứ không có đích thì
 * không nói được gì. Gần hết lượt (từ 90%) thì tô đậm để người quản lý biết
 * sắp phải nới giới hạn hoặc tạo mã mới.
 */
export function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (!limit) return <span className="font-mono">{used}</span>;

  const phan = Math.min(1, used / limit);
  const sapHet = phan >= 0.9;
  const g = FLAGS.adminGlass;

  return (
    <span className="inline-flex w-full min-w-[150px] items-center justify-end gap-2.5 max-lg:min-w-0">
      <span
        role="progressbar"
        aria-label="Lượt dùng"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className={cn(
          "adm-track block h-2 max-w-[120px] flex-1 overflow-hidden",
          g ? "rounded-full bg-[rgba(42,36,32,0.08)]" : "bg-subtle",
        )}
      >
        <i
          className={cn(
            "block h-full",
            g ? "rounded-full" : "",
            sapHet
              ? "bg-accent-700"
              : g
                ? "bg-[linear-gradient(90deg,#f07a63,var(--color-accent))]"
                : "bg-accent",
          )}
          // Còn lượt nào là phải thấy được một vạch, kể cả khi mới dùng 1/1000.
          style={{ width: used > 0 ? `max(4px, ${phan * 100}%)` : 0 }}
        />
      </span>
      <span className={cn("min-w-[76px] text-right font-mono text-[12.5px] tabular-nums", sapHet && "font-bold text-accent-700")}>
        {used}/{limit}
      </span>
    </span>
  );
}
