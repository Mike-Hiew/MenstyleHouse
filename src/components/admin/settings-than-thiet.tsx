"use client";

import * as React from "react";
import { useActionState } from "react";
import { formatVnd } from "@/lib/money";
import { tierFor } from "@/lib/tiers";
import { luuThanThietAction } from "@/app/admin/cai-dat/actions";
import type { AdminActionState } from "@/app/admin/actions";
import { Bao, Nhom, NutLuu, O, oNhap } from "./settings-fields";

export type ThanThietData = {
  redeemEnabled: boolean;
  pointValue: number;
  redeemMaxPct: number;
  tiersEnabled: boolean;
  tierSilver: number;
  tierGold: number;
  tierDiamond: number;
};

/**
 * Điểm thưởng và phân hạng khách.
 *
 * Ngưỡng hạng trước đây là hằng số trong mã, đổi một con số phải sửa file và
 * deploy lại.
 *
 * Khối phân hạng có **bảng thử ngay tại chỗ**: gõ một số tiền, thấy ngay hạng mà
 * ngưỡng đang gõ dở sẽ cho ra. Đặt ngưỡng mà không thấy hệ quả là cách đẩy sai
 * sót tới lúc khách gọi lên hỏi vì sao mãi không lên hạng.
 */
export function SettingsThanThiet({ data }: { data: ThanThietData }) {
  const [state, luu, pending] = useActionState<AdminActionState, FormData>(luuThanThietAction, {});

  const [batHang, setBatHang] = React.useState(data.tiersEnabled);
  const [batDiem, setBatDiem] = React.useState(data.redeemEnabled);
  const [diemGiaTri, setDiemGiaTri] = React.useState(data.pointValue);
  const [tranPct, setTranPct] = React.useState(data.redeemMaxPct);
  const [bac, setBac] = React.useState(data.tierSilver);
  const [vang, setVang] = React.useState(data.tierGold);
  const [kim, setKim] = React.useState(data.tierDiamond);
  const [thu, setThu] = React.useState(1_500_000);

  const nguong = { tierSilver: bac, tierGold: vang, tierDiamond: kim };
  const thuTu = bac < vang && vang < kim;

  return (
    <form action={luu} className="grid max-w-[900px] items-start gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <Bao state={state} />
      </div>

      <div className="flex flex-col gap-6">
        <Nhom title="Điểm thưởng">
          <label className="flex min-h-11 items-center gap-2.5 border-2 border-divider px-3.5 text-[13.5px] font-semibold">
            <input
              type="checkbox"
              name="redeemEnabled"
              checked={batDiem}
              onChange={(e) => setBatDiem(e.target.checked)}
              className="h-[18px] w-[18px] accent-accent"
            />
            Cho khách dùng điểm trừ vào tiền đơn
          </label>

          <p className="text-[13px] leading-[1.7] text-muted">
            Khách tích 1 điểm cho mỗi 1.000 ₫ đã thanh toán. Tắt ô trên thì điểm vẫn cộng nhưng
            không tiêu được — chỉ dùng để xét hạng.
          </p>

          <div
            className={
              "grid gap-4 sm:grid-cols-2" + (batDiem ? "" : " pointer-events-none opacity-40")
            }
          >
            <O
              label="1 điểm đổi được (₫)"
              name="pointValue"
              value={diemGiaTri}
              onChange={setDiemGiaTri}
              so
            />
            <O
              label="Trần % tiền hàng trả bằng điểm"
              name="redeemMaxPct"
              value={tranPct}
              onChange={setTranPct}
              so
            />
          </div>

          <p className="text-[12.5px] leading-[1.7] text-faint">
            Trần phần trăm là chốt an toàn: không có nó thì một tài khoản tích lâu năm lấy được gần
            như cả đơn bằng điểm. Điểm chỉ trừ vào tiền hàng, không trừ phí giao.
          </p>
        </Nhom>
      </div>

      <div className="flex flex-col gap-6">
        <Nhom title="Phân hạng khách hàng">
          {/*
            Bật/tắt cả chương trình. Cửa hàng không chạy hạng thì tắt đi, chứ
            không phải nhìn một cột luôn ghi "MỚI" ở mọi màn.
          */}
          <label className="flex min-h-11 items-center gap-2.5 border-2 border-divider px-3.5 text-[13.5px] font-semibold">
            <input
              type="checkbox"
              name="tiersEnabled"
              checked={batHang}
              onChange={(e) => setBatHang(e.target.checked)}
              className="h-[18px] w-[18px] accent-accent"
            />
            Bật chương trình hạng thành viên
          </label>

          {!batHang ? (
            <p className="border border-dashed border-border-soft bg-subtle px-3.5 py-3 text-[13px] leading-[1.7] text-muted">
              Đang tắt. Hạng không hiện ở trang tài khoản, menu tài khoản và bảng khách hàng. Chi
              tiêu vẫn được ghi nhận như thường, nên bật lại lúc nào cũng có sẵn số.
            </p>
          ) : null}

          <p className="text-[13px] leading-[1.7] text-muted">
            Hạng tính theo tổng chi tiêu 12 tháng gần nhất, chỉ đếm đơn chưa huỷ. So sánh bằng dấu{" "}
            <strong>lớn hơn</strong>: tiêu đúng bằng ngưỡng thì chưa lên hạng.
          </p>

          <div
            className={
              "grid gap-4 sm:grid-cols-3" + (batHang ? "" : " pointer-events-none opacity-40")
            }
          >
            <O label="Lên BẠC khi vượt (₫)" name="tierSilver" value={bac} onChange={setBac} so />
            <O label="Lên VÀNG khi vượt (₫)" name="tierGold" value={vang} onChange={setVang} so />
            <O
              label="Lên KIM CƯƠNG khi vượt (₫)"
              name="tierDiamond"
              value={kim}
              onChange={setKim}
              so
            />
          </div>

          {batHang && !thuTu ? (
            <p className="border-2 border-accent bg-accent-100 px-3.5 py-2.5 text-[13px] font-semibold text-accent-800">
              Ngưỡng phải tăng dần: BẠC &lt; VÀNG &lt; KIM CƯƠNG. Đặt ngược thì có hạng không bao
              giờ với tới được.
            </p>
          ) : null}

          <div
            className={"border-2 border-border-soft bg-subtle p-4" + (batHang ? "" : " opacity-40")}
          >
            <p className="label-tech mb-3 font-bold">THỬ NGAY</p>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[12px] font-semibold">Khách tiêu (₫)</span>
              <input
                type="number"
                value={thu}
                onChange={(e) => setThu(Number(e.target.value) || 0)}
                className={oNhap}
              />
            </label>
            <p className="text-[14px]">
              Chi {formatVnd(thu)} →{" "}
              <strong className="text-[16px]">{thuTu ? tierFor(thu, nguong) : "—"}</strong>
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
      </div>

      <div className="lg:col-span-2">
        <NutLuu pending={pending} />
      </div>
    </form>
  );
}
