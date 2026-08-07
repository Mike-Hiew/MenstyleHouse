import { cn } from "@/lib/cn";

export function Table({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-x-auto border-2 border-divider bg-surface">
      <table className={cn("w-full border-collapse text-[14px]", className)}>
        {children}
      </table>
    </div>
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
        "border-b-2 border-divider px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-600",
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

export function Td({
  className,
  align = "left",
  mono,
  children,
}: {
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <td
      className={cn(
        "border-b border-hairline px-3 py-2.5 align-middle",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono text-[13px]",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-14 text-center text-neutral-500">
        {children}
      </td>
    </tr>
  );
}
