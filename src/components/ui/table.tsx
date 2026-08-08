import { cn } from "@/lib/cn";

/**
 * Dưới `lg:` bảng không cuộn ngang mà mỗi hàng thu thành một thẻ viền 2px —
 * quy tắc trong `docs/RESPONSIVE.md`. Làm hoàn toàn bằng CSS trên cùng một cây
 * markup, không render hai nhánh khác nhau.
 *
 * Ở chế độ thẻ, mỗi `<Td>` truyền `role` để biết nằm đâu trong thẻ
 * (`code`/`badge` là dòng đầu, `title`, `meta`, rồi `foot`/`foot-end` ở chân).
 */
export function Table({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full lg:overflow-x-auto lg:border-2 lg:border-divider lg:bg-surface">
      <table
        className={cn(
          "w-full border-collapse text-[14px]",
          "max-lg:block max-lg:space-y-2.5",
          className,
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="max-lg:hidden">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="max-lg:block">{children}</tbody>;
}

export function Tr({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <tr
      className={cn(
        "max-lg:block max-lg:border-2 max-lg:border-divider max-lg:bg-surface max-lg:p-3",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Th({
  className,
  align = "left",
  children,
}: {
  className?: string;
  align?: "left" | "right" | "center";
  children?: React.ReactNode;
}) {
  return (
    <th
      className={cn(
        "border-b-2 border-divider px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Vai trò của ô khi bảng thu thành thẻ trên màn hẹp. */
type CellRole = "code" | "badge" | "title" | "meta" | "foot" | "foot-end";

const ROLE_STYLES: Record<CellRole, string> = {
  code: "max-lg:font-mono max-lg:text-[13px] max-lg:font-bold",
  badge: "max-lg:text-right",
  title: "max-lg:text-[13px] max-lg:font-semibold",
  meta: "max-lg:text-[12px] max-lg:text-muted",
  foot: "max-lg:mt-2.5 max-lg:border-t max-lg:border-hairline max-lg:pt-2.5 max-lg:text-[12px] max-lg:text-muted",
  "foot-end":
    "max-lg:mt-2.5 max-lg:border-t max-lg:border-hairline max-lg:pt-2.5 max-lg:text-right max-lg:font-bold",
};

/** Ô đứng cùng một hàng ngang trong thẻ. */
const PAIRED: Record<CellRole, boolean> = {
  code: true,
  badge: true,
  title: false,
  meta: false,
  foot: true,
  "foot-end": true,
};

export function Td({
  className,
  align = "left",
  mono,
  role,
  label,
  children,
}: {
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  role?: CellRole;
  /** Nhãn cột hiện trước nội dung khi ở chế độ thẻ. */
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <td
      className={cn(
        "border-b border-hairline px-3 py-2.5 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono text-[13px]",
        // Chế độ thẻ: bỏ viền và đệm của ô bảng, xếp dọc.
        "max-lg:block max-lg:border-0 max-lg:px-0 max-lg:py-0 max-lg:text-left",
        role && ROLE_STYLES[role],
        role && PAIRED[role] && "max-lg:inline-block max-lg:w-1/2 max-lg:align-middle",
        className,
      )}
    >
      {label ? <span className="label-tech mb-1 hidden max-lg:block">{label}</span> : null}
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="max-lg:block max-lg:border-2 max-lg:border-dashed max-lg:border-border-soft">
      <td
        colSpan={colSpan}
        className="px-3 py-14 text-center text-muted max-lg:block max-lg:py-10"
      >
        {children}
      </td>
    </tr>
  );
}
