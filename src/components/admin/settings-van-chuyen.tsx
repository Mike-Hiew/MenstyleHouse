"use client";

import { useActionState } from "react";
import { luuVanChuyenAction } from "@/app/admin/cai-dat/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Bao, Nhom, NutLuu, O } from "./settings-fields";

export type VanChuyenData = {
  shipInnerCity: number;
  shipProvince: number;
  freeShipFrom: number;
  vatRate: number;
  holdMinutes: number;
};

/** Phí giao, thuế suất và thời gian giữ đơn chưa thanh toán. */
export function SettingsVanChuyen({ data }: { data: VanChuyenData }) {
  const [state, luu, pending] = useActionState<AdminActionState, FormData>(luuVanChuyenAction, {});

  return (
    <form action={luu} className="flex max-w-[560px] flex-col gap-6">
      <Bao state={state} />

      <Nhom title="Vận chuyển & thuế">
        <div className="grid gap-4 sm:grid-cols-2">
          <O
            label="Phí ship nội thành (₫)"
            name="shipInnerCity"
            defaultValue={data.shipInnerCity}
            so
          />
          <O label="Phí ship tỉnh (₫)" name="shipProvince" defaultValue={data.shipProvince} so />
          <O
            label="Miễn phí ship cho đơn từ (₫)"
            name="freeShipFrom"
            defaultValue={data.freeShipFrom}
            so
          />
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

      <NutLuu pending={pending} />
    </form>
  );
}
