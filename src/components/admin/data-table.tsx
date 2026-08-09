"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { qs, withParam, withSort } from "@/lib/table-params";
import { CsvExportDialog } from "./csv-export-dialog";

/**
 * Bảng dùng chung cho mọi màn admin: tab, tìm, lọc, chọn dòng, sắp xếp, phân
 * trang. Trạng thái nằm trên URL nên chia sẻ link và bấm Back đều đúng.
 *
 * **Không nhận hàm từ server**: RSC không tuần tự hoá được hàm, nên server
 * render sẵn từng ô thành `ReactNode` rồi truyền xuống, còn dữ liệu thô cho
 * CSV đi riêng dưới dạng chuỗi/số.
 *
 * Dưới `lg:` mỗi hàng thu thành thẻ — `card` quyết định ô nằm đâu trong thẻ.
 */

export type ColumnMeta = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  card?: "code" | "badge" | "title" | "meta" | "foot" | "foot-end" | "hide";
};

export type TableRow = {
  id: string;
  cells: React.ReactNode[];
  /** Giá trị thô theo `key` của cột, dùng khi xuất CSV. */
  csv: Record<string, string | number>;
};

export type Tab = { key: string; label: string; count?: number };

export type HangLoat = {
  key: string;
  label: string;
  /** Hỏi lại trước khi chạy — dùng cho việc không lùi được. */
  hoiLai?: string;
};

export type Filter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function DataTable({
  basePath,
  params,
  title,
  subtitle,
  action,
  tabs,
  filters,
  columns,
  rows,
  total,
  page,
  pageSize,
  searchPlaceholder = "Tìm…",
  csvName,
  hangLoat,
  onHangLoat,
}: {
  basePath: string;
  /** Query string hiện tại, không có dấu `?`. */
  params: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  tabs?: Tab[];
  filters?: Filter[];
  columns: ColumnMeta[];
  rows: TableRow[];
  total: number;
  page: number;
  pageSize: number;
  searchPlaceholder?: string;
  csvName: string;
  /** Các thao tác chạy trên nhiều dòng cùng lúc. */
  hangLoat?: HangLoat[];
  /** Server Action nhận khoá thao tác và danh sách id, trả về câu báo kết quả. */
  onHangLoat?: (key: string, ids: string[]) => Promise<string>;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const current = React.useMemo(() => new URLSearchParams(params), [params]);

  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [csvOpen, setCsvOpen] = React.useState(false);
  const [baoHangLoat, setBaoHangLoat] = React.useState<string | null>(null);
  const [dangChay, batDau] = React.useTransition();

  // Đổi bộ lọc thì bỏ chọn — giữ lại sẽ thao tác nhầm lên dòng không còn thấy.
  React.useEffect(() => {
    setPicked(new Set());
    setBaoHangLoat(null);
  }, [params]);

  const go = (next: URLSearchParams) =>
    startTransition(() => router.push((basePath + qs(next)) as Route, { scroll: false }));

  const activeTab = current.get("tab") ?? tabs?.[0]?.key ?? "";
  const sortKey = current.get("sap") ?? "";
  const sortDir = current.get("chieu") === "asc" ? "asc" : "desc";
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const csvColumns = columns.filter((c) => c.key in (rows[0]?.csv ?? {}));

  const buildCsv = React.useCallback(
    (keys: string[], onlyPicked: boolean) => {
      const source = onlyPicked ? rows.filter((r) => picked.has(r.id)) : rows;
      const cols = csvColumns.filter((c) => keys.includes(c.key));
      return {
        header: cols.map((c) => c.label),
        body: source.map((r) => cols.map((c) => r.csv[c.key] ?? "")),
      };
    },
    [rows, picked, csvColumns],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-soft pb-3.5">
        <div>
          <h1 className="text-[26px] lg:text-[34px]">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-[13.5px] text-muted">{subtitle}</p> : null}
        </div>
        {action ? (
          <a
            href={action.href}
            className="flex min-h-11 items-center bg-accent px-5 text-[13.5px] font-extrabold text-bg"
          >
            {action.label}
          </a>
        ) : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className="mb-[18px] flex overflow-x-auto border-b border-hairline">
          {tabs.map((t) => {
            const on = t.key === activeTab;
            return (
              <button
                key={t.key || "all"}
                type="button"
                aria-pressed={on}
                onClick={() => go(withParam(current, "tab", t.key || null))}
                className={cn(
                  "mr-[18px] flex-none whitespace-nowrap border-b-[3px] pb-2.5 pr-[18px] pt-3 text-[13.5px]",
                  on ? "border-accent font-extrabold" : "border-transparent font-normal text-muted",
                )}
              >
                {t.label}{" "}
                {t.count !== undefined ? (
                  <span className="font-mono text-[11px] text-faint">{t.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <form
          className="flex w-full items-center gap-2 border border-border-soft bg-subtle px-3 py-2.5 sm:w-[300px]"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            go(withParam(current, "q", String(value ?? "")));
          }}
        >
          <Search size={14} className="flex-none text-faint" aria-hidden />
          <input
            name="q"
            defaultValue={current.get("q") ?? ""}
            aria-label="Tìm trong bảng"
            placeholder={searchPlaceholder}
            className="w-full border-0 bg-transparent text-[13px] outline-none"
          />
        </form>

        {filters?.map((f) => (
          <select
            key={f.key}
            aria-label={f.label}
            value={current.get(f.key) ?? ""}
            onChange={(e) => go(withParam(current, f.key, e.target.value || null))}
            className="min-h-11 border border-border-soft bg-bg px-3.5 text-[13px] font-semibold"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}

        <button
          type="button"
          onClick={() => setCsvOpen(true)}
          className="ml-auto min-h-11 border border-border-soft px-4 text-[12.5px] font-extrabold"
        >
          Xuất CSV{picked.size > 0 ? ` (${picked.size})` : ""}
        </button>
      </div>

      {/*
        Thanh hành động hàng loạt chỉ hiện khi **đã chọn dòng**. Bày sẵn khi chưa
        chọn gì thì nó là một dãy nút bấm vào không có tác dụng, và người dùng
        học được rằng nút ở đây không đáng tin.
      */}
      {hangLoat && hangLoat.length > 0 && picked.size > 0 ? (
        <div
          role="group"
          aria-label="Thao tác hàng loạt"
          className="mb-3.5 flex flex-wrap items-center gap-2 border-2 border-divider bg-subtle px-3.5 py-2.5"
        >
          <span className="text-[13px] font-extrabold">Đã chọn {picked.size} dòng</span>
          {hangLoat.map((h) => (
            <button
              key={h.key}
              type="button"
              disabled={dangChay}
              onClick={() => {
                if (h.hoiLai && !confirm(h.hoiLai.replace("{n}", String(picked.size)))) return;
                batDau(async () => {
                  const ket = await onHangLoat!(h.key, [...picked]);
                  setPicked(new Set());
                  setBaoHangLoat(ket);
                  router.refresh();
                });
              }}
              className="min-h-11 border border-border-soft bg-bg px-3.5 text-[12.5px] font-extrabold disabled:opacity-60"
            >
              {h.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicked(new Set())}
            className="ml-auto min-h-11 px-2 text-[12.5px] underline"
          >
            Bỏ chọn
          </button>
        </div>
      ) : null}

      {baoHangLoat ? (
        <p
          role="status"
          className="mb-3.5 border-2 border-divider bg-surface px-3.5 py-2.5 text-[13px] font-semibold"
        >
          {baoHangLoat}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="border border-dashed border-border-soft bg-subtle px-5 py-12 lg:px-8 lg:py-14">
          <h2 className="mb-2 text-[20px]">Không có dòng nào khớp</h2>
          <p className="mb-5 text-[14px] text-muted">
            {current.get("q")
              ? `Từ khoá “${current.get("q")}” không tìm thấy kết quả trong tab này. Thử xoá từ khoá hoặc chuyển tab khác.`
              : "Chưa có dữ liệu trong tab này."}
          </p>
          {current.get("q") ? (
            <button
              type="button"
              onClick={() => go(withParam(current, "q", null))}
              className="min-h-11 bg-accent px-5 text-[13.5px] font-extrabold text-bg"
            >
              XOÁ TỪ KHOÁ
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="lg:overflow-x-auto">
            <table className="bang-quan-tri w-full border-collapse max-lg:block max-lg:space-y-2.5 lg:min-w-[760px]">
              <thead className="max-lg:hidden">
                <tr>
                  <th className="w-[34px] border-b-2 border-border-soft py-2.5 pr-3">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allPicked}
                      onChange={toggleAll}
                      className="h-[15px] w-[15px] accent-accent"
                    />
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "label-tech whitespace-nowrap border-b-2 border-border-soft py-2.5 pr-3 font-bold",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.align !== "right" && c.align !== "center" && "text-left",
                      )}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => go(withSort(current, c.key))}
                          className="inline-flex items-center gap-1"
                        >
                          {c.label}
                          {sortKey === c.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          ) : null}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="max-lg:block">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="max-lg:block max-lg:border-2 max-lg:border-divider max-lg:bg-surface max-lg:p-3 lg:hover:bg-subtle"
                  >
                    <td className="border-b border-hairline py-3 pr-3 max-lg:mb-2 max-lg:block max-lg:border-0 max-lg:p-0">
                      <input
                        type="checkbox"
                        aria-label="Chọn dòng"
                        checked={picked.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        className="h-[15px] w-[15px] accent-accent"
                      />
                    </td>
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={cn(
                          "border-b border-hairline py-3 pr-3 text-[13.5px]",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                          "max-lg:block max-lg:border-0 max-lg:p-0 max-lg:text-left",
                          c.card === "hide" && "max-lg:hidden",
                          c.card === "code" && "max-lg:font-mono max-lg:font-bold",
                          c.card === "title" && "max-lg:font-semibold",
                          c.card === "meta" && "max-lg:text-[12px] max-lg:text-muted",
                          (c.card === "foot" || c.card === "foot-end") &&
                            "max-lg:mt-2.5 max-lg:border-t max-lg:border-hairline max-lg:pt-2.5",
                          (c.card === "code" ||
                            c.card === "badge" ||
                            c.card === "foot" ||
                            c.card === "foot-end") &&
                            "max-lg:inline-block max-lg:w-1/2 max-lg:align-middle",
                          (c.card === "badge" || c.card === "foot-end") && "max-lg:text-right",
                        )}
                      >
                        {row.cells[i]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p className="label-tech font-bold">
              {total} DÒNG · TRANG {page}/{pages}
            </p>
            {pages > 1 ? (
              <div className="flex">
                {pageNumbers(page, pages).map((n, i) =>
                  n === "…" ? (
                    <span key={"gap" + i} className="px-2 text-faint">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      onClick={() => go(withParam(current, "trang", String(n)))}
                      className={cn(
                        "min-h-11 border border-r-0 border-border-soft px-3.5 text-[12.5px] font-extrabold last:border-r",
                        n === page ? "bg-neutral-900 text-bg" : "hover:bg-subtle",
                      )}
                    >
                      {n}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </>
      )}

      <CsvExportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        columns={csvColumns.map((c) => ({ key: c.key, label: c.label }))}
        pickedCount={picked.size}
        fileName={csvName}
        build={buildCsv}
      />
    </div>
  );
}

function pageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}
