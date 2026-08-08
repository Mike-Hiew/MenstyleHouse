"use client";

import * as React from "react";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/input";
import {
  datMacDinhAction,
  luuDiaChiAction,
  xoaDiaChiAction,
  type TaiKhoanState,
} from "@/app/(tai-khoan)/tai-khoan-actions";
import { PROVINCES } from "@/lib/dia-gioi";

export type DiaChi = {
  id: string;
  label: string;
  receiver: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
};

/**
 * Sổ địa chỉ — tab thứ ba của mockup.
 *
 * Trước đây `saveAddress` / `deleteAddress` / `setDefaultAddress` đã viết đủ
 * nhưng **không màn nào gọi tới**, nên sổ địa chỉ của khách mới vĩnh viễn rỗng
 * và ô "chọn địa chỉ đã lưu" ở bước thanh toán chẳng bao giờ có gì để chọn.
 */
export function AddressBook({ danhSach }: { danhSach: DiaChi[] }) {
  const [dangSua, setDangSua] = React.useState<DiaChi | null>(null);
  const [moForm, setMoForm] = React.useState(danhSach.length === 0);

  return (
    <div className="max-w-[720px]">
      {danhSach.length === 0 ? (
        <p className="mb-5 border border-dashed border-border-soft bg-subtle px-5 py-6 text-[14px] text-muted">
          Chưa có địa chỉ nào. Lưu sẵn một địa chỉ thì lần sau đặt hàng không phải gõ lại.
        </p>
      ) : (
        <ul className="mb-5 border-t border-hairline">
          {danhSach.map((d) => (
            <li key={d.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-hairline py-4">
              <div className="min-w-[200px] flex-1">
                <p className="text-[14.5px] font-extrabold">
                  {d.label}
                  {d.isDefault ? (
                    <span className="ml-2 bg-neutral-900 px-2 py-0.5 font-mono text-[10px] font-bold text-bg">
                      MẶC ĐỊNH
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[13.5px]">
                  {d.receiver} · {d.phone}
                </p>
                <p className="text-[13px] text-muted">
                  {d.street}, {d.ward}, {d.district}, {d.province}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {d.isDefault ? null : (
                  <button
                    type="button"
                    onClick={() => datMacDinhAction(d.id)}
                    className="min-h-11 text-[13px] font-semibold underline"
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDangSua(d);
                    setMoForm(true);
                  }}
                  className="min-h-11 text-[13px] font-semibold underline"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Xoá địa chỉ không lấy lại được, nên hỏi một câu.
                    if (confirm(`Xoá địa chỉ “${d.label}”?`)) xoaDiaChiAction(d.id);
                  }}
                  className="min-h-11 text-[13px] font-semibold text-accent-700 underline"
                >
                  Xoá
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {moForm ? (
        <AddressForm
          dangSua={dangSua}
          xong={() => {
            setDangSua(null);
            setMoForm(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDangSua(null);
            setMoForm(true);
          }}
          className="flex h-12 items-center border-2 border-divider px-6 text-[14px] font-extrabold"
        >
          + THÊM ĐỊA CHỈ
        </button>
      )}
    </div>
  );
}

function AddressForm({ dangSua, xong }: { dangSua: DiaChi | null; xong: () => void }) {
  const [state, luu, pending] = useActionState<TaiKhoanState, FormData>(luuDiaChiAction, {});
  const err = (k: string) => state.errors?.[k];
  const cu = (k: keyof DiaChi) => String(state.values?.[k] ?? dangSua?.[k] ?? "");

  React.useEffect(() => {
    if (state.ok) xong();
  }, [state.ok, xong]);

  return (
    <form action={luu} key={dangSua?.id ?? "moi"} className="grid gap-4 border-2 border-divider p-5 sm:grid-cols-2">
      {dangSua ? <input type="hidden" name="id" value={dangSua.id} /> : null}

      {state.message && !state.ok ? (
        <p role="alert" className="border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800 sm:col-span-2">
          {state.message}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Field label="Đặt tên cho địa chỉ" required error={err("label")} hint="Ví dụ: Nhà, Công ty">
          <Input name="label" defaultValue={cu("label")} placeholder="Nhà" />
        </Field>
      </div>

      <Field label="Người nhận" required error={err("receiver")}>
        <Input name="receiver" defaultValue={cu("receiver")} autoComplete="name" />
      </Field>

      <Field label="Số điện thoại" required error={err("phone")}>
        <Input name="phone" defaultValue={cu("phone")} inputMode="numeric" autoComplete="tel" />
      </Field>

      <Field label="Tỉnh/Thành phố" required error={err("province")}>
        <select
          name="province"
          defaultValue={cu("province") || PROVINCES[0]}
          className="h-11 w-full border border-border-soft bg-surface px-3 text-[15px] lg:h-10 lg:text-[14px]"
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Quận/Huyện" required error={err("district")}>
        <Input name="district" defaultValue={cu("district")} />
      </Field>

      <Field label="Phường/Xã" required error={err("ward")}>
        <Input name="ward" defaultValue={cu("ward")} />
      </Field>

      <Field label="Địa chỉ cụ thể" required error={err("street")}>
        <Input name="street" defaultValue={cu("street")} placeholder="Số nhà, tên đường" />
      </Field>

      <label className="flex min-h-11 items-center gap-2.5 text-[13.5px] sm:col-span-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={dangSua?.isDefault ?? false}
          className="h-[18px] w-[18px] accent-accent"
        />
        Dùng làm địa chỉ mặc định
      </label>

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : dangSua ? "CẬP NHẬT" : "LƯU ĐỊA CHỈ"}
        </button>
        <button
          type="button"
          onClick={xong}
          className="flex h-12 items-center border-2 border-divider px-6 text-[14px] font-extrabold"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
