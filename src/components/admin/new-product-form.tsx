"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { createProductAction, type AdminActionState } from "@/app/admin/actions";

type Picker = { id: string; name: string };

/**
 * Tạo sản phẩm mới.
 *
 * Cố ý gọn: chỉ những gì bắt buộc để có một bản ghi hợp lệ. Biến thể, ảnh, SEO
 * và giá sale làm ở màn sửa ngay sau đó — nhồi hết vào một form thì nhân viên
 * phải điền xong mười mấy ô mới thấy được sản phẩm hình thù ra sao.
 *
 * Không có ô tồn kho, cũng không có ô mã sản phẩm: mã do hệ thống cấp tiếp
 * theo dãy, còn tồn chỉ vào bằng phiếu nhập (luật số 2).
 */
export function NewProductForm({
  categories,
  brands,
}: {
  categories: Picker[];
  brands: Picker[];
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    createProductAction,
    {},
  );

  return (
    <form action={action} className="flex max-w-[760px] flex-col gap-4">
      {state.message ? (
        <p
          role="alert"
          className="border-2 border-accent bg-accent-100 px-4 py-3 text-[13.5px] font-semibold text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <Row label="Tên sản phẩm" hint="Mã sản phẩm và đường dẫn sinh tự động từ tên">
        <input name="name" placeholder="Áo thun cotton basic" className={input} autoFocus />
      </Row>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Danh mục">
          <select name="categoryId" className={input} defaultValue="">
            <option value="" disabled>
              Chọn danh mục…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Thương hiệu" hint="Không bắt buộc">
          <select name="brandId" className={input} defaultValue="">
            <option value="">— Không đặt —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Giá gốc (₫)">
          <input name="basePrice" inputMode="numeric" placeholder="390000" className={input} />
        </Row>
      </div>

      <Row label="Mô tả sản phẩm">
        <textarea
          name="description"
          rows={5}
          placeholder="Form chuẩn người Việt, đường may đôi ở thân và vai…"
          className={input}
        />
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Chất liệu" hint="Không bắt buộc">
          <input name="material" placeholder="Cotton 250gsm" className={input} />
        </Row>
        <Row label="Hướng dẫn bảo quản" hint="Không bắt buộc">
          <input name="careNote" placeholder="Giặt máy dưới 30°C" className={input} />
        </Row>
      </div>

      <p className="border border-dashed border-border-soft bg-subtle px-4 py-3 text-[12.5px] leading-[1.6] text-muted">
        Sản phẩm tạo ra ở trạng thái <strong>Nháp</strong>. Thêm biến thể và ảnh xong mới chuyển
        sang Đang bán — sản phẩm chưa có biến thể thì khách bấm vào không mua được gì.
      </p>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang tạo…" : "TẠO SẢN PHẨM"}
        </button>
      </div>
    </form>
  );
}

const input = cn(
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none",
  "focus:border-accent lg:text-[14px]",
);

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}
