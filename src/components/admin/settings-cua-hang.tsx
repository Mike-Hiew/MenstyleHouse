"use client";

import { useActionState } from "react";
import { luuCuaHangAction } from "@/app/admin/cai-dat/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Bao, Nhom, NutLuu, O } from "./settings-fields";

export type CuaHangData = {
  shopName: string;
  taxCode: string;
  address: string;
  hotline: string;
  email: string;
};

/** Thông tin cửa hàng — in lên hoá đơn, phiếu 80mm và chân trang website. */
export function SettingsCuaHang({ data }: { data: CuaHangData }) {
  const [state, luu, pending] = useActionState<AdminActionState, FormData>(luuCuaHangAction, {});

  return (
    <form action={luu} className="flex max-w-[560px] flex-col gap-6">
      <Bao state={state} />

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

      <NutLuu pending={pending} />
    </form>
  );
}
