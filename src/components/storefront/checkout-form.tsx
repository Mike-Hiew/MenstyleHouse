"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatVnd } from "@/lib/money";
import { placeOrderAction, type CheckoutState } from "@/app/thanh-toan/actions";
import type { ShippingQuote } from "@/lib/shipping";
import { PROVINCES } from "@/lib/dia-gioi";

/**
 * Checkout 3 bước theo `docs/API.md`; thanh bước hiện 4 mốc vì mockup tính cả
 * "Giỏ" là bước 1 (đã xong). Bố cục bám `isCheckout` trong mockup: mốc bước là
 * **kẻ trên 4px**, nhãn "BƯỚC n" bằng mono.
 *
 * Toàn bộ là **một form**; các bước chỉ ẩn/hiện bằng CSS nên dữ liệu đã nhập
 * không mất khi quay lại.
 */

export type SavedAddress = {
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

const STEPS = ["Giỏ hàng", "Thông tin", "Vận chuyển", "Thanh toán"];

/**
 * Ba lựa chọn như mockup, nhưng chỉ hai cái bật được: COD và chuyển khoản đều
 * chạy trọn vẹn mà không cần bên thứ ba. Ví điện tử đợi tài khoản cổng thanh
 * toán — bày một lựa chọn bấm vào không đi tới đâu còn tệ hơn là chưa bày.
 */
const PAY_OPTIONS = [
  {
    value: "COD",
    tag: "COD",
    name: "Thanh toán khi nhận hàng",
    note: "Trả tiền mặt cho shipper. Phí thu hộ 0 ₫.",
  },
  {
    value: "BANK_TRANSFER",
    tag: "CK",
    name: "Chuyển khoản ngân hàng",
    note: "Chuyển trước, cửa hàng xác nhận khi tiền về.",
  },
] as const;

type PayValue = (typeof PAY_OPTIONS)[number]["value"];

export function CheckoutForm({
  subtotal,
  discount,
  couponCode,
  quotesByProvince,
  isMember,
  addresses,
  toi,
  nganHang,
}: {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  quotesByProvince: Record<string, ShippingQuote[]>;
  isMember: boolean;
  /** Hồ sơ người đang đăng nhập, để điền sẵn khi sổ địa chỉ còn trống. */
  toi?: { name: string; phone: string; email: string } | null;
  addresses: SavedAddress[];
  /** Tài khoản nhận chuyển khoản, lấy từ cài đặt cửa hàng. */
  nganHang: { bankName: string; bankAccount: string; bankOwner: string; qrUrl: string | null };
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [carrier, setCarrier] = React.useState("GHN");
  const [pay, setPay] = React.useState<PayValue>("COD");
  const [vat, setVat] = React.useState(false);

  const preset = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [addrId, setAddrId] = React.useState<string | "new">(preset ? preset.id : "new");
  const chosen = addrId === "new" ? null : addresses.find((a) => a.id === addrId) ?? null;

  const [province, setProvince] = React.useState(preset?.province ?? PROVINCES[0]);
  React.useEffect(() => {
    if (chosen) setProvince(chosen.province);
  }, [chosen]);

  const idempotencyKey = React.useMemo(
    () => Math.random().toString(36).slice(2) + Date.now().toString(36),
    [],
  );

  const payable = Math.max(0, subtotal - discount);
  const fee = quotesByProvince[province]?.find((q) => q.carrier === carrier)?.fee ?? 0;
  const total = payable + fee;

  /*
   * Nhảy về bước 1 khi lỗi nằm ở bước 1.
   *
   * Các bước ẩn nhau bằng CSS, nên lỗi của một trường ở bước 1 vẫn được render
   * — chỉ là trong khối đang `hidden`. Khách bấm "Đặt hàng" ở bước 3, server
   * chặn, và màn hình không nhúc nhích: đúng kiểu hỏng im lặng. Danh sách này
   * phải gồm **cả** các trường hoá đơn VAT, chúng cũng nằm ở bước 1.
   */
  React.useEffect(() => {
    if (!state.errors) return;
    const buoc1 = [
      "receiver", "phone", "email", "province", "district", "ward", "street", "note",
      "vatBuyerName", "vatTaxCode", "vatAddress", "vatEmail",
    ];
    if (buoc1.some((f) => state.errors?.[f])) setStep(1);
  }, [state.errors]);

  const err = (name: string) => state.errors?.[name];

  /*
   * Giá trị khách vừa gõ, do server trả về sau một lần đặt hỏng.
   *
   * `lan` tăng mỗi lần `state` đổi để React **gắn lại** các ô — `defaultValue`
   * chỉ có tác dụng lúc mount, mà React 19 lại tự reset form sau mỗi action.
   * Không có nó thì form về trắng và khách gõ lại từ đầu.
   */
  const cu = (name: string) => state.values?.[name];
  const lan = React.useMemo(() => JSON.stringify(state.values ?? null), [state.values]);

  // Ô tick và nút chọn không có `defaultValue`, phải trả về bằng state.
  React.useEffect(() => {
    const v = state.values;
    if (!v) return;
    setVat(Boolean(v.vatRequested));
    if (v.paymentMethod === "COD" || v.paymentMethod === "BANK_TRANSFER") setPay(v.paymentMethod);
    if (v.carrier) setCarrier(v.carrier);
    if (v.province) setProvince(v.province);
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="carrier" value={carrier} />
      <input type="hidden" name="province" value={province} />

      {/* Thanh bước: kẻ trên 4px, nhãn mono — đúng mockup. */}
      <ol className="mb-8 grid grid-cols-2 gap-0.5 sm:grid-cols-4" aria-label="Các bước thanh toán">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className={cn(
                "border-t-4 pt-2.5",
                active ? "border-accent" : done ? "border-divider" : "border-hairline",
              )}
            >
              <span className="label-tech block font-bold text-neutral-400">BƯỚC {i + 1}</span>
              <span
                className={cn(
                  "mt-1.5 block text-[13px] font-extrabold",
                  active ? "text-text" : done ? "text-muted" : "text-faint",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {state.message ? (
            <p
              role="alert"
              className="mb-5 border-2 border-accent bg-accent-100 px-4 py-3 text-[14px] font-semibold text-accent-800"
            >
              {state.message}
            </p>
          ) : null}

          {/* ── Bước 1: thông tin nhận hàng ── */}
          <section className={cn(step !== 1 && "hidden")}>
            <h2 className="mb-5 text-[24px]">Thông tin nhận hàng</h2>

            {!isMember ? (
              <div className="mb-6 flex flex-wrap items-center gap-5 border-2 border-border-soft px-5 py-4">
                <div className="min-w-[220px] flex-1">
                  <p className="mb-1 text-[14.5px] font-extrabold">
                    Bạn đang đặt hàng với tư cách khách vãng lai
                  </p>
                  <p className="text-[13px] leading-[1.6] text-muted">
                    Đơn vẫn được xử lý bình thường. Đăng ký thì địa chỉ này được lưu lại và đơn
                    được tích điểm.
                  </p>
                </div>
                <Link
                  href={{ pathname: "/dang-ky" }}
                  className="flex min-h-11 flex-none items-center bg-accent px-4 text-[13px] font-extrabold text-bg"
                >
                  ĐĂNG KÝ NHANH
                </Link>
              </div>
            ) : null}

            {isMember && addresses.length > 0 ? (
              <div className="mb-6">
                <p className="label-tech mb-3 font-bold">SỔ ĐỊA CHỈ ĐÃ LƯU</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer gap-3 border p-4",
                        addrId === a.id ? "border-accent bg-accent-100" : "border-border-soft",
                      )}
                    >
                      <input
                        type="radio"
                        name="savedaddr"
                        checked={addrId === a.id}
                        onChange={() => setAddrId(a.id)}
                        className="mt-0.5 h-[17px] w-[17px] flex-none accent-accent"
                      />
                      <span className="flex-1">
                        <span className="mb-1.5 flex items-center gap-2">
                          <strong className="text-[14px]">{a.label}</strong>
                          {a.isDefault ? (
                            <span className="bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-bg">
                              MẶC ĐỊNH
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-[13px] leading-[1.6] text-muted">
                          {a.phone} · {a.street}, {a.ward}, {a.district}, {a.province}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <label
                  className={cn(
                    "mt-3 flex cursor-pointer items-center gap-3 border px-4 py-3.5",
                    addrId === "new" ? "border-accent bg-accent-100" : "border-border-soft",
                  )}
                >
                  <input
                    type="radio"
                    name="savedaddr"
                    checked={addrId === "new"}
                    onChange={() => setAddrId("new")}
                    className="h-[17px] w-[17px] accent-accent"
                  />
                  <span className="text-[14px] font-semibold">Giao tới địa chỉ khác</span>
                </label>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Cell span={2}>
                <FieldRow label="Người nhận" error={err("receiver")}>
                  <input
                    name="receiver"
                    defaultValue={cu("receiver") ?? chosen?.receiver ?? toi?.name ?? ""}
                    key={"r" + addrId}
                    autoComplete="name"
                    placeholder="Nguyễn Minh Hiếu"
                    className={inputCls(err("receiver"))}
                  />
                </FieldRow>
              </Cell>

              <FieldRow label="Số điện thoại" error={err("phone")}>
                <input
                  name="phone"
                  key={"p" + addrId}
                  defaultValue={cu("phone") ?? chosen?.phone ?? toi?.phone ?? ""}
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0903128447"
                  className={inputCls(err("phone"))}
                />
              </FieldRow>

              <FieldRow label="Email (không bắt buộc)" error={err("email")}>
                <input
                  name="email"
                  key={"e" + lan}
                  defaultValue={cu("email") ?? toi?.email ?? ""}
                  type="email"
                  autoComplete="email"
                  placeholder="ban@email.com"
                  className={inputCls(err("email"))}
                />
              </FieldRow>

              <FieldRow label="Tỉnh / Thành phố" error={err("province")}>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={inputCls(err("province"))}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Quận / Huyện" error={err("district")}>
                <input
                  name="district"
                  key={"d" + addrId}
                  defaultValue={cu("district") ?? chosen?.district ?? ""}
                  placeholder="Quận Tân Bình"
                  className={inputCls(err("district"))}
                />
              </FieldRow>

              <FieldRow label="Phường / Xã" error={err("ward")}>
                <input
                  name="ward"
                  key={"w" + addrId}
                  defaultValue={cu("ward") ?? chosen?.ward ?? ""}
                  placeholder="Phường 12"
                  className={inputCls(err("ward"))}
                />
              </FieldRow>

              <Cell span={2}>
                <FieldRow label="Địa chỉ cụ thể" error={err("street")}>
                  <input
                    name="street"
                    key={"s" + addrId}
                    defaultValue={cu("street") ?? chosen?.street ?? ""}
                    autoComplete="street-address"
                    placeholder="128 Trường Chinh"
                    className={inputCls(err("street"))}
                  />
                </FieldRow>
              </Cell>

              <Cell span={2}>
                <FieldRow label="Ghi chú (không bắt buộc)" error={err("note")}>
                  <textarea
                    name="note"
                    key={"n" + lan}
                    defaultValue={cu("note") ?? ""}
                    rows={3}
                    placeholder="Giao giờ hành chính, gọi trước khi đến…"
                    className={inputCls(err("note"))}
                  />
                </FieldRow>
              </Cell>
            </div>

            {/*
              Ô xuất hoá đơn công ty. Thông tin khai ở đây được *chốt vào đơn*
              chứ không tạo hoá đơn ngay — số hoá đơn chỉ do kế toán cấp, và
              chốt lúc đặt để hồ sơ công ty đổi về sau không sửa ngược đơn cũ.
            */}
            <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[14px]">
              <input
                type="checkbox"
                name="vatRequested"
                checked={vat}
                onChange={(e) => setVat(e.target.checked)}
                className="mt-[3px] h-4 w-4 accent-accent"
              />
              <span>Xuất hoá đơn công ty (VAT)</span>
            </label>

            {vat ? (
              <div className="mt-4 grid gap-4 bg-subtle p-5 sm:grid-cols-2">
                <Cell span={2}>
                  <FieldRow label="Tên công ty" error={err("vatBuyerName")}>
                    <input
                      name="vatBuyerName"
                      key={"vatBuyerName" + lan}
                      defaultValue={cu("vatBuyerName") ?? ""}
                      placeholder="Công ty TNHH ABC"
                      className={inputCls(err("vatBuyerName"))}
                    />
                  </FieldRow>
                </Cell>
                <FieldRow label="Mã số thuế" error={err("vatTaxCode")}>
                  <input
                    name="vatTaxCode"
                    key={"vatTaxCode" + lan}
                    defaultValue={cu("vatTaxCode") ?? ""}
                    inputMode="numeric"
                    placeholder="0316998221"
                    className={inputCls(err("vatTaxCode"))}
                  />
                </FieldRow>
                <FieldRow label="Email nhận hoá đơn" error={err("vatEmail")}>
                  <input
                    name="vatEmail"
                    key={"vatEmail" + lan}
                    defaultValue={cu("vatEmail") ?? ""}
                    type="email"
                    placeholder="ketoan@congty.vn"
                    className={inputCls(err("vatEmail"))}
                  />
                </FieldRow>
                <Cell span={2}>
                  <FieldRow label="Địa chỉ trên hoá đơn" error={err("vatAddress")}>
                    <input
                      name="vatAddress"
                      key={"vatAddress" + lan}
                      defaultValue={cu("vatAddress") ?? ""}
                      placeholder="Số nhà, đường, phường, quận, tỉnh"
                      className={inputCls(err("vatAddress"))}
                    />
                  </FieldRow>
                </Cell>
              </div>
            ) : null}
          </section>

          {/* ── Bước 2: vận chuyển ── */}
          <section className={cn("flex flex-col gap-3", step !== 2 && "hidden")}>
            <h2 className="mb-2 text-[24px]">Chọn đơn vị giao hàng</h2>
            {(quotesByProvince[province] ?? []).map((q) => (
              <label
                key={q.carrier}
                className={cn(
                  "flex min-h-[60px] cursor-pointer items-center gap-3 border-2 px-4",
                  carrier === q.carrier ? "border-accent bg-accent-100" : "border-border-soft",
                )}
              >
                <input
                  type="radio"
                  name="carrierChoice"
                  checked={carrier === q.carrier}
                  onChange={() => setCarrier(q.carrier)}
                  className="h-[18px] w-[18px] accent-accent"
                />
                <span className="flex-1">
                  <span className="block text-[14px] font-semibold">{q.name}</span>
                  <span className="block text-[12.5px] text-muted">Dự kiến {q.etaText}</span>
                </span>
                <span className="font-mono text-[14px] font-bold">
                  {q.fee === 0 ? "Miễn phí" : formatVnd(q.fee)}
                </span>
              </label>
            ))}
            <p className="text-[12.5px] text-faint">
              Bảng phí phẳng tạm tính. Nối API hãng vận chuyển ở M7.
            </p>
          </section>

          {/* ── Bước 3: thanh toán ── */}
          <section className={cn("flex flex-col gap-3", step !== 3 && "hidden")}>
            <h2 className="mb-2 text-[24px]">Hình thức thanh toán</h2>
            {PAY_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  "flex min-h-[60px] cursor-pointer items-center gap-3.5 border-2 px-4",
                  pay === o.value ? "border-accent bg-accent-100" : "border-border-soft",
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={o.value}
                  checked={pay === o.value}
                  onChange={() => setPay(o.value)}
                  className="h-[17px] w-[17px] accent-accent"
                />
                <span className="label-tech h-[30px] w-11 flex-none bg-neutral-900 text-center leading-[30px] text-bg">
                  {o.tag}
                </span>
                <span className="flex-1">
                  <span className="block text-[14.5px] font-extrabold">{o.name}</span>
                  <span className="block text-[12.5px] text-muted">{o.note}</span>
                </span>
              </label>
            ))}

            {pay === "BANK_TRANSFER" ? (
              /* Mockup: ảnh QR 150×150 bên trái, thông tin tài khoản bên phải. */
              <div className="mt-2 flex flex-wrap items-center gap-6 bg-subtle p-5 text-[14px] leading-[1.9]">
                {nganHang.qrUrl ? (
                  <span className="relative h-[150px] w-[150px] flex-none bg-white">
                    <Image
                      src={nganHang.qrUrl}
                      alt="Mã QR chuyển khoản của cửa hàng"
                      fill
                      sizes="150px"
                      className="object-contain p-1"
                    />
                  </span>
                ) : null}
                <div className="min-w-[240px] flex-1">
                <p className="label-tech mb-2 font-bold text-faint">CHUYỂN KHOẢN NGÂN HÀNG</p>
                <p>
                  <strong>{nganHang.bankName}</strong>
                </p>
                <p>
                  Số TK: <strong className="font-mono">{nganHang.bankAccount}</strong>
                </p>
                <p>
                  Chủ TK: <strong>{nganHang.bankOwner}</strong>
                </p>
                <p className="mt-2 text-[13px] text-muted">
                  Nội dung chuyển khoản là <strong>mã đơn</strong> hiện ở màn hình sau khi đặt. Đơn
                  được xác nhận khi cửa hàng đối chiếu thấy tiền về.
                </p>
                </div>
              </div>
            ) : null}

            <p className="text-[12.5px] text-faint">
              Ví điện tử (VNPay, MoMo, ZaloPay) mở khi có tài khoản cổng thanh toán.
            </p>
          </section>

          <div className="mt-8 flex gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="h-12 flex-1 border-2 border-divider text-[14px] font-extrabold lg:flex-none lg:px-8"
              >
                Quay lại
              </button>
            ) : null}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                className="h-12 flex-1 bg-neutral-900 text-[14px] font-extrabold text-bg lg:flex-none lg:px-10"
              >
                Tiếp tục
              </button>
            ) : (
              <button
                type="submit"
                disabled={pending}
                className="h-12 flex-1 bg-accent text-[14px] font-extrabold text-bg disabled:opacity-60 lg:flex-none lg:px-10"
              >
                {pending ? "Đang đặt đơn…" : "ĐẶT ĐƠN"}
              </button>
            )}
          </div>
        </div>

        <aside className="border-t-2 border-divider pt-[18px] lg:sticky lg:top-[120px]">
          <h2 className="mb-4 text-[16px] font-extrabold">Tóm tắt đơn</h2>
          <dl className="flex flex-col gap-2.5 border-t border-hairline py-3.5 text-[14px]">
            <Row label="Tạm tính" value={formatVnd(subtotal)} />
            <Row
              label={couponCode ? "Giảm giá · " + couponCode : "Giảm giá"}
              value={"−" + formatVnd(discount)}
            />
            <Row label="Phí vận chuyển" value={fee === 0 ? "Miễn phí" : formatVnd(fee)} />
          </dl>
          <div className="flex items-baseline justify-between border-t-2 border-divider py-4">
            <span className="text-[14px] font-extrabold">TỔNG CỘNG</span>
            <span className="text-[24px] font-extrabold tracking-[-0.02em]">
              {formatVnd(total)}
            </span>
          </div>
        </aside>
      </div>
    </form>
  );
}

/** Ô chiếm trọn hai cột trong lưới địa chỉ. */
function Cell({ span, children }: { span: 1 | 2; children: React.ReactNode }) {
  return <div className={span === 2 ? "sm:col-span-2" : undefined}>{children}</div>;
}

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-[12px] font-semibold text-accent-700">{error}</p> : null}
    </div>
  );
}

function inputCls(error?: string) {
  return cn(
    "w-full border bg-bg px-3.5 py-3 text-[16px] outline-none lg:text-[14px]",
    error ? "border-accent" : "border-border-soft focus:border-accent",
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
