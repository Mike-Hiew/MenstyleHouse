"use client";

import * as React from "react";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { tierFor } from "@/lib/tiers";
import { saveSettingsAction, type AdminActionState } from "@/app/admin/actions";

export type SettingsFormData = {
  shopName: string;
  taxCode: string;
  address: string;
  hotline: string;
  email: string;
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  shipInnerCity: number;
  shipProvince: number;
  freeShipFrom: number;
  vatRate: number;
  holdMinutes: number;
  tierSilver: number;
  tierGold: number;
  tierDiamond: number;
  payCod: boolean;
  payBank: boolean;
};

/**
 * Cài đặt cửa hàng.
 *
 * Hai nhóm đầu đúng mockup `settings`. Nhóm phân hạng là thứ mockup không có
 * nhưng ngưỡng phải sửa được: trước đây nó là hằng số trong mã, đổi một con số
 * phải sửa file và deploy lại.
 *
 * Khối phân hạng có **bảng thử ngay tại chỗ**: gõ một số tiền, thấy ngay hạng
 * mà ngưỡng đang gõ dở sẽ cho ra. Đặt ngưỡng mà không thấy hệ quả là cách đẩy
 * sai sót tới lúc khách gọi lên hỏi vì sao mãi không lên hạng.
 */
export function SettingsForm({ data }: { data: SettingsFormData }) {
  const [state, save, pending] = useActionState<AdminActionState, FormData>(
    saveSettingsAction,
    {},
  );

  const [bac, setBac] = React.useState(data.tierSilver);
  const [vang, setVang] = React.useState(data.tierGold);
  const [kim, setKim] = React.useState(data.tierDiamond);
  const [thu, setThu] = React.useState(1_500_000);

  const nguong = { tierSilver: bac, tierGold: vang, tierDiamond: kim };
  const thuTu = bac < vang && vang < kim;

  return (
    <form action={save} className="grid items-start gap-8 xl:grid-cols-2">
      {state.message ? (
        <p
          role="alert"
          className={cn(
            "border-2 px-4 py-3 text-[13.5px] font-semibold xl:col-span-2",
            state.ok ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-8">
        <Nhom title="Thông tin cửa hàng">
          <O label="Tên cửa hàng" name="shopName" defaultValue={data.shopName} />
          <O label="Mã số thuế" name="taxCode" defaultValue={data.taxCode} mono />
          <O label="Địa chỉ" name="address" defaultValue={data.address} />
          <O label="Hotline" name="hotline" defaultValue={data.hotline} />
          <O label="Email chăm sóc khách" name="email" defaultValue={data.email} />
          <p className="text-[12.5px] leading-[1.6] text-faint">
            Những dòng này in lên hoá đơn GTGT, phiếu 80mm và chân trang website.
          </p>
        </Nhom>

        <Nhom title="Tài khoản nhận chuyển khoản">
          <O label="Ngân hàng" name="bankName" defaultValue={data.bankName} />
          <O label="Số tài khoản" name="bankAccount" defaultValue={data.bankAccount} mono />
          <O label="Chủ tài khoản" name="bankOwner" defaultValue={data.bankOwner} />
          <p className="text-[12.5px] leading-[1.6] text-faint">
            Khách chọn chuyển khoản ở bước thanh toán sẽ thấy đúng ba dòng này.
          </p>
        </Nhom>

        <Nhom title="Vận chuyển & thuế">
          <div className="grid gap-4 sm:grid-cols-2">
            <O label="Phí ship nội thành (₫)" name="shipInnerCity" defaultValue={data.shipInnerCity} so />
            <O label="Phí ship tỉnh (₫)" name="shipProvince" defaultValue={data.shipProvince} so />
            <O label="Miễn phí ship cho đơn từ (₫)" name="freeShipFrom" defaultValue={data.freeShipFrom} so />
            <O label="Thuế suất GTGT (%)" name="vatRate" defaultValue={data.vatRate} so />
          </div>
          <O
            label="Giữ đơn chưa thanh toán (phút)"
            name="holdMinutes"
            defaultValue={data.holdMinutes}
            so
            hint="Quá hạn thì đơn tự huỷ và hoàn tồn. Chỉ áp cho đơn trả trước, không áp cho COD."
          />
        </Nhom>
      </div>

      <div className="flex flex-col gap-8">
        <Nhom title="Phân hạng khách hàng">
          <p className="text-[13px] leading-[1.7] text-muted">
            Hạng tính theo tổng chi tiêu 12 tháng gần nhất, chỉ đếm đơn chưa huỷ. So sánh bằng dấu{" "}
            <strong>lớn hơn</strong>: tiêu đúng bằng ngưỡng thì chưa lên hạng.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <O label="Lên BẠC khi vượt (₫)" name="tierSilver" value={bac} onChange={setBac} so />
            <O label="Lên VÀNG khi vượt (₫)" name="tierGold" value={vang} onChange={setVang} so />
            <O label="Lên KIM CƯƠNG khi vượt (₫)" name="tierDiamond" value={kim} onChange={setKim} so />
          </div>

          {!thuTu ? (
            <p className="border-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] font-semibold text-accent-800">
              Ngưỡng phải tăng dần: BẠC &lt; VÀNG &lt; KIM CƯƠNG. Đặt ngược thì có hạng không bao
              giờ với tới được.
            </p>
          ) : null}

          <div className="border-2 border-border-soft bg-subtle p-4">
            <p className="label-tech mb-3 font-bold">THỬ NGAY</p>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[12px] font-semibold">Khách tiêu (₫)</span>
              <input
                type="number"
                value={thu}
                onChange={(e) => setThu(Number(e.target.value) || 0)}
                className={o}
              />
            </label>
            <p className="text-[14px]">
              Chi {formatVnd(thu)} →{" "}
              <strong className="text-[16px]">
                {thuTu ? tierFor(thu, nguong) : "—"}
              </strong>
            </p>
            <ul className="mt-3 flex flex-col gap-1 border-t border-hairline pt-3 text-[12.5px] text-muted">
              {[bac, bac + 1, vang, vang + 1, kim, kim + 1].map((v, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="font-mono">{formatVnd(v)}</span>
                  <span className="font-semibold">{thuTu ? tierFor(v, nguong) : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </Nhom>

        <Nhom title="Phương thức thanh toán">
          <label className="flex cursor-pointer items-center gap-3 border-b border-hairline py-2.5 text-[13.5px]">
            <input
              type="checkbox"
              name="payCod"
              defaultChecked={data.payCod}
              className="h-4 w-4 accent-accent"
            />
            <span className="flex-1 font-semibold">Thanh toán khi nhận hàng (COD)</span>
            <span className="label-tech">0 ₫</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 border-b border-hairline py-2.5 text-[13.5px]">
            <input
              type="checkbox"
              name="payBank"
              defaultChecked={data.payBank}
              className="h-4 w-4 accent-accent"
            />
            <span className="flex-1 font-semibold">Chuyển khoản ngân hàng</span>
            <span className="label-tech">0 ₫</span>
          </label>
          <p className="text-[12.5px] leading-[1.6] text-faint">
            Ví điện tử (VNPay, MoMo, ZaloPay) chưa bật vì chưa có tài khoản cổng thanh toán. Tắt
            hết cả hai thì khách không đặt được đơn nên server sẽ chặn.
          </p>
        </Nhom>

        <div>
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 bg-accent px-7 text-[14px] font-extrabold text-bg disabled:opacity-60"
          >
            {pending ? "Đang lưu…" : "LƯU CÀI ĐẶT"}
          </button>
        </div>
      </div>
    </form>
  );
}

const o =
  "w-full border border-border-soft bg-bg px-3.5 py-3 text-[16px] outline-none focus:border-accent lg:text-[14px]";

function Nhom({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-divider pt-3.5">
      <h2 className="mb-3.5 text-[19px]">{title}</h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function O({
  label,
  name,
  defaultValue,
  value,
  onChange,
  hint,
  so,
  mono,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  value?: number;
  onChange?: (v: number) => void;
  hint?: string;
  so?: boolean;
  mono?: boolean;
}) {
  const dieuKhien = value !== undefined && onChange;
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold">{label}</span>
      <input
        name={name}
        inputMode={so ? "numeric" : undefined}
        {...(dieuKhien
          ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value) || 0) }
          : { defaultValue })}
        className={cn(o, mono && "font-mono")}
      />
      {hint ? <span className="mt-1 block text-[12px] leading-[1.6] text-faint">{hint}</span> : null}
    </label>
  );
}
