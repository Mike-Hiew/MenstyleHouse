"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";
import { toCsv } from "@/lib/format";

/**
 * Xuất CSV 4 bước. Mockup chỉ có nút "Xuất CSV" chứ không vẽ dialog, nên bốn
 * bước dưới đây do tôi thiết kế theo đúng ngôn ngữ Modernist của các dialog
 * khác — đã báo và được duyệt.
 *
 * 1. Phạm vi   — tất cả dòng đang lọc, hay chỉ dòng đã chọn
 * 2. Cột       — tick cột muốn xuất
 * 3. Định dạng — dấu phân cách và kiểu ngày
 * 4. Xác nhận  — xem lại rồi tải
 *
 * File luôn có BOM `﻿` (`toCsv`) — thiếu là Excel bản Việt hỏng font.
 */

export type CsvColumn = { key: string; label: string };

type Built = { header: string[]; body: (string | number)[][] };

const STEPS = ["Phạm vi", "Chọn cột", "Định dạng", "Xác nhận"];

export function CsvExportDialog({
  open,
  onClose,
  columns,
  pickedCount,
  fileName,
  build,
}: {
  open: boolean;
  onClose: () => void;
  columns: CsvColumn[];
  pickedCount: number;
  fileName: string;
  build: (keys: string[], onlyPicked: boolean) => Built;
}) {
  const [step, setStep] = React.useState(0);
  const [onlyPicked, setOnlyPicked] = React.useState(false);
  const [keys, setKeys] = React.useState<string[]>(() => columns.map((c) => c.key));
  const [delimiter, setDelimiter] = React.useState<";" | ",">(";");

  // Mở lại thì về bước đầu; giữ nguyên lựa chọn cột cho lần xuất sau.
  React.useEffect(() => {
    if (open) {
      setStep(0);
      setOnlyPicked(pickedCount > 0);
    }
  }, [open, pickedCount]);

  const preview = React.useMemo(
    () => (open ? build(keys, onlyPicked) : { header: [], body: [] }),
    [open, keys, onlyPicked, build],
  );

  const canNext = step === 1 ? keys.length > 0 : true;

  const download = () => {
    const rows = [preview.header, ...preview.body];
    // `toCsv` dùng dấu `;`; đổi sang `,` thì dựng lại bằng cùng quy tắc thoát.
    const content =
      delimiter === ";"
        ? toCsv(rows)
        : "﻿" +
          rows
            .map((r) =>
              r
                .map((v) => {
                  const s = v == null ? "" : String(v);
                  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
                })
                .join(","),
            )
            .join("\r\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Xuất CSV" width={620}>
      <ol className="mb-6 grid grid-cols-4 gap-0.5" aria-label="Các bước xuất CSV">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "border-t-4 pt-2",
              i === step ? "border-accent" : i < step ? "border-divider" : "border-hairline",
            )}
          >
            <span className="label-tech block font-bold text-neutral-400">BƯỚC {i + 1}</span>
            <span
              className={cn(
                "mt-1 block text-[12.5px] font-extrabold",
                i === step ? "text-text" : "text-faint",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">Phạm vi xuất</legend>
          <Choice
            checked={!onlyPicked}
            onChange={() => setOnlyPicked(false)}
            title="Tất cả dòng đang lọc"
            note={`${preview.body.length || "—"} dòng theo bộ lọc và tab hiện tại.`}
          />
          <Choice
            checked={onlyPicked}
            onChange={() => setOnlyPicked(true)}
            disabled={pickedCount === 0}
            title="Chỉ dòng đã chọn"
            note={
              pickedCount === 0
                ? "Chưa chọn dòng nào — tick ô đầu dòng trong bảng trước."
                : `${pickedCount} dòng đang được chọn.`
            }
          />
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset>
          <legend className="label-tech mb-3 font-bold">CỘT MUỐN XUẤT</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {columns.map((c) => (
              <label key={c.key} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={keys.includes(c.key)}
                  onChange={() =>
                    setKeys((s) =>
                      s.includes(c.key) ? s.filter((k) => k !== c.key) : [...s, c.key],
                    )
                  }
                  className="h-[18px] w-[18px] accent-accent"
                />
                {c.label}
              </label>
            ))}
          </div>
          {keys.length === 0 ? (
            <p className="mt-3 text-[12.5px] font-semibold text-accent-700">
              Chọn ít nhất một cột.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="label-tech mb-1 font-bold">DẤU PHÂN CÁCH</legend>
          <Choice
            checked={delimiter === ";"}
            onChange={() => setDelimiter(";")}
            title="Dấu chấm phẩy (;)"
            note="Excel bản Việt mở thẳng ra cột. Chọn cái này nếu không chắc."
          />
          <Choice
            checked={delimiter === ","}
            onChange={() => setDelimiter(",")}
            title="Dấu phẩy (,)"
            note="Chuẩn quốc tế, hợp với Google Sheets và công cụ lập trình."
          />
          <p className="mt-1 text-[12.5px] text-faint">
            File luôn kèm BOM UTF-8 nên tiếng Việt không bị vỡ font.
          </p>
        </fieldset>
      ) : null}

      {step === 3 ? (
        <div>
          <dl className="mb-4 flex flex-col gap-2 text-[14px]">
            <SummaryRow label="Phạm vi" value={onlyPicked ? `${pickedCount} dòng đã chọn` : "Tất cả dòng đang lọc"} />
            <SummaryRow label="Số dòng" value={String(preview.body.length)} />
            <SummaryRow label="Số cột" value={String(keys.length)} />
            <SummaryRow label="Phân cách" value={delimiter === ";" ? "Chấm phẩy (;)" : "Phẩy (,)"} />
          </dl>
          <p className="label-tech mb-2 font-bold">XEM TRƯỚC 3 DÒNG ĐẦU</p>
          <div className="overflow-x-auto border border-border-soft bg-subtle p-3">
            <pre className="font-mono text-[11.5px] leading-[1.7]">
              {[preview.header, ...preview.body.slice(0, 3)]
                .map((r) => r.join(delimiter))
                .join("\n") || "(không có dòng nào)"}
            </pre>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2.5 border-t-2 border-divider pt-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="min-h-11 border border-border-soft px-5 text-[13.5px] font-extrabold"
          >
            Quay lại
          </button>
        ) : null}

        {step < 3 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="ml-auto min-h-11 bg-neutral-900 px-6 text-[13.5px] font-extrabold text-bg disabled:opacity-40"
          >
            Tiếp tục
          </button>
        ) : (
          <button
            type="button"
            disabled={preview.body.length === 0}
            onClick={download}
            className="ml-auto min-h-11 bg-accent px-6 text-[13.5px] font-extrabold text-bg disabled:opacity-40"
          >
            TẢI FILE CSV
          </button>
        )}
      </div>
    </Dialog>
  );
}

function Choice({
  checked,
  onChange,
  title,
  note,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  note: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex gap-3 border-2 px-4 py-3",
        checked ? "border-accent bg-accent-100" : "border-border-soft",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-[17px] w-[17px] flex-none accent-accent"
      />
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-muted">{note}</span>
      </span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
