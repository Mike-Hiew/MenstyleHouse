"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { catalogMetaAction, type AdminActionState } from "@/app/admin/actions";

export type MetaRow = {
  id: string;
  loai: "Danh mục" | "Thương hiệu";
  name: string;
  slug: string | null;
  sort: number;
  soSanPham: number;
};

/**
 * Khối sửa cho màn "Danh mục & thương hiệu".
 *
 * Mockup là bản tĩnh: bấm một dòng chỉ hiện toast "Mở danh mục X". Bảng thì
 * dựng đúng mockup bằng `DataTable` ở trang cha; phần thật sự sửa được nằm ở
 * đây, ngay dưới bảng.
 *
 * Hai thứ được canh chặt:
 *
 * 1. **Slug danh mục không đổi theo tên.** Slug nằm trong URL công khai
 *    `/danh-muc/<slug>` và trong link khách đã lưu; kéo nó theo tên là làm chết
 *    link cũ một cách âm thầm.
 * 2. **Còn sản phẩm thì không xoá.** Chặn ở server; ở đây chỉ nói trước lý do
 *    thay vì mời bấm một nút chắc chắn hỏng.
 */
export function CatalogMeta({ rows }: { rows: MetaRow[] }) {
  const [state, run, pending] = useActionState<AdminActionState, FormData>(catalogMetaAction, {});
  const [dangSua, setDangSua] = React.useState<string | null>(null);

  const chon = rows.find((r) => r.id === dangSua) ?? null;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {state.message ? (
        <p
          role="alert"
          className={cn(
            "border-2 px-4 py-3 text-[13.5px] font-semibold",
            state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <section className="border-2 border-border-soft p-5">
        <h2 className="label-tech mb-3 font-bold">SỬA MỘT MỤC</h2>

        <label className="mb-4 block max-w-[420px]">
          <span className="mb-1.5 block text-[12px] font-semibold">Chọn mục</span>
          <select
            value={dangSua ?? ""}
            onChange={(e) => setDangSua(e.target.value || null)}
            className={o}
          >
            <option value="">— Chọn danh mục hoặc thương hiệu —</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.loai} · {r.name} ({r.soSanPham} sản phẩm)
              </option>
            ))}
          </select>
        </label>

        {chon ? (
          <div className="flex flex-wrap items-end gap-3">
            {chon.loai === "Danh mục" ? (
              <form action={run} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="viec" value="sua-danh-muc" />
                <input type="hidden" name="id" value={chon.id} />
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">Tên</span>
                  <input
                    key={chon.id}
                    name="name"
                    defaultValue={chon.name}
                    className={cn(o, "min-w-[240px]")}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">Thứ tự</span>
                  <input
                    key={"s" + chon.id}
                    name="sort"
                    defaultValue={chon.sort}
                    inputMode="numeric"
                    className={cn(o, "w-20 text-right font-mono")}
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-12 bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
                >
                  LƯU
                </button>
              </form>
            ) : (
              <p className="text-[13.5px] text-muted">
                Thương hiệu chỉ có tên. Đổi tên thì xoá rồi tạo lại — tên thương hiệu nằm trong
                bộ lọc công khai.
              </p>
            )}

            {chon.soSanPham > 0 ? (
              <p className="text-[12.5px] text-faint">
                Đang có {chon.soSanPham} sản phẩm nên chưa xoá được.
              </p>
            ) : (
              <form action={run}>
                <input
                  type="hidden"
                  name="viec"
                  value={chon.loai === "Danh mục" ? "xoa-danh-muc" : "xoa-thuong-hieu"}
                />
                <input type="hidden" name="id" value={chon.id} />
                <button
                  type="submit"
                  className="min-h-12 border-2 border-divider px-5 text-[13.5px] font-extrabold"
                >
                  XOÁ
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            Chọn một mục ở trên để đổi tên, đổi thứ tự hiển thị hoặc xoá.
          </p>
        )}

        {chon?.loai === "Danh mục" ? (
          <p className="mt-3 text-[12.5px] leading-[1.6] text-faint">
            Đường dẫn <span className="font-mono">/danh-muc/{chon.slug}</span> cố định, không đổi
            theo tên — link khách đã lưu và kết quả tìm kiếm vẫn dùng đường dẫn cũ.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={run} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="viec" value="them-danh-muc" />
          <label className="block flex-1">
            <span className="mb-1.5 block text-[12px] font-semibold">Danh mục mới</span>
            <input name="name" required placeholder="Áo len" className={o} />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
          >
            THÊM
          </button>
        </form>

        <form action={run} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="viec" value="them-thuong-hieu" />
          <label className="block flex-1">
            <span className="mb-1.5 block text-[12px] font-semibold">Thương hiệu mới</span>
            <input name="name" required placeholder="Kojima" className={o} />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 border-2 border-divider px-5 text-[13.5px] font-extrabold disabled:opacity-60"
          >
            THÊM
          </button>
        </form>
      </section>
    </div>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[14px]";
