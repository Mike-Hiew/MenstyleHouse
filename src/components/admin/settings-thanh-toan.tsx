"use client";

import { useActionState } from "react";
import { luuThanhToanAction } from "@/app/admin/cai-dat/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Bao, Nhom, NutLuu, O } from "./settings-fields";

export type ThanhToanData = {
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  payCod: boolean;
  payBank: boolean;
};

/**
 * Tài khoản nhận chuyển khoản và các phương thức thanh toán đang bật.
 *
 * Hai thứ này ở chung một trang vì chúng đi với nhau: tắt chuyển khoản thì ba
 * dòng tài khoản phía trên không còn ai nhìn thấy.
 */
export function SettingsThanhToan({ data }: { data: ThanhToanData }) {
  const [state, luu, pending] = useActionState<AdminActionState, FormData>(luuThanhToanAction, {});

  return (
    <form action={luu} className="flex max-w-[560px] flex-col gap-6">
      <Bao state={state} />

      <Nhom title="Tài khoản nhận chuyển khoản">
        <O label="Ngân hàng" name="bankName" defaultValue={data.bankName} />
        <O label="Số tài khoản" name="bankAccount" defaultValue={data.bankAccount} mono />
        <O label="Chủ tài khoản" name="bankOwner" defaultValue={data.bankOwner} />
        <p className="text-[12.5px] leading-[1.6] text-faint">
          Khách chọn chuyển khoản ở bước thanh toán sẽ thấy đúng ba dòng này.
        </p>
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
          Ví điện tử (VNPay, MoMo, ZaloPay) chưa bật vì chưa có tài khoản cổng thanh toán. Tắt hết
          cả hai thì khách không đặt được đơn nên server sẽ chặn.
        </p>
      </Nhom>

      <NutLuu pending={pending} />
    </form>
  );
}
