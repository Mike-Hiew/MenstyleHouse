import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { ProductGrid } from "@/components/storefront/product-card";
import { ProfileForm } from "@/components/storefront/profile-form";
import { PasswordForm } from "@/components/storefront/password-form";
import { AddressBook } from "@/components/storefront/address-book";
import { CancelOrderButton } from "@/components/storefront/cancel-order";
import { logoutAction } from "@/app/(tai-khoan)/actions";
import { currentUserId } from "@/auth";
import { currentStaff } from "@/server/admin/guard";
import { ROLE_LABEL } from "@/lib/roles";
import { getPointSummary } from "@/server/accounts";
import { hangCuaToi } from "@/server/membership";
import { listOrdersForUser } from "@/server/orders";
import { listAddresses } from "@/server/addresses";
import { listWishlist } from "@/server/wishlist";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatVnd } from "@/lib/money";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tài khoản — Men Style House" };

const REASON_LABEL: Record<string, string> = {
  EARN_ORDER: "Tích từ đơn hàng",
  REDEEM_ORDER: "Dùng cho đơn hàng",
  ADJUST: "Điều chỉnh",
  EXPIRE: "Hết hạn",
  REFUND: "Hoàn điểm",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PACKING: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
  RETURNED: "Đã trả hàng",
};

/** Đơn còn huỷ được — cùng danh sách với `CANCELLABLE` ở `src/server/orders.ts`. */
const HUY_DUOC = ["PENDING", "CONFIRMED"];

/**
 * Bốn tab đúng như mockup: `['Lịch sử đơn hàng','Hồ sơ','Sổ địa chỉ','Sản phẩm
 * yêu thích']`. Tab chọn bằng query string chứ không phải trạng thái client —
 * gửi link cho người khác vẫn mở đúng tab, và bấm Back vẫn lùi đúng chỗ.
 */
const TABS = [
  { key: "don-hang", ten: "Lịch sử đơn hàng" },
  { key: "ho-so", ten: "Hồ sơ" },
  { key: "dia-chi", ten: "Sổ địa chỉ" },
  { key: "yeu-thich", ten: "Sản phẩm yêu thích" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/dang-nhap");

  const tabRaw = (await searchParams).tab;
  const tab: TabKey = TABS.some((t) => t.key === tabRaw) ? (tabRaw as TabKey) : "don-hang";

  const [points, orders, staff, hang, diaChi, yeuThich, me] = await Promise.all([
    getPointSummary(userId),
    listOrdersForUser(userId),
    currentStaff(),
    hangCuaToi(userId),
    listAddresses(userId),
    listWishlist(userId),
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, phone: true, email: true },
    }),
  ]);

  return (
    <>
      <Header />
      <main>
        <Container className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "TÀI KHOẢN"]} />

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-divider pb-4">
            <div>
              <h1 className="text-[28px] lg:text-[40px]">{points.name}</h1>
              <p className="label-tech mt-1">
                {staff ? ROLE_LABEL[staff.role].toUpperCase() : "THÀNH VIÊN"}
                {hang.bat ? " · HẠNG " + hang.hang : ""}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 items-center text-[13px] font-extrabold text-accent-700 underline"
              >
                Đăng xuất
              </button>
            </form>
          </div>

          {staff ? (
            <Link
              href={{ pathname: "/admin" }}
              className="mb-6 flex flex-wrap items-center gap-4 border-2 border-divider bg-subtle px-5 py-4"
            >
              <span className="flex-1">
                <span className="block text-[15px] font-extrabold">Khu quản trị</span>
                <span className="block text-[13px] text-muted">
                  Bạn đang đăng nhập với vai trò {ROLE_LABEL[staff.role]}.
                </span>
              </span>
              <span className="flex min-h-11 flex-none items-center bg-accent px-5 text-[13px] font-extrabold text-bg">
                MỞ QUẢN TRỊ →
              </span>
            </Link>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-10">
            <aside className="self-start">
              <section className="mb-5 bg-neutral-900 p-5 text-bg">
                <p className="label-tech mb-1.5 text-neutral-400">ĐIỂM THƯỞNG</p>
                <p className="text-[38px] font-extrabold leading-none tracking-[-0.03em]">
                  {points.balance}
                </p>
                <p className="mt-2 text-[12.5px] leading-[1.6] text-hairline">
                  Đã chi {formatVnd(hang.chiTieu)} trong 12 tháng.
                  {hang.bat
                    ? hang.tiep
                      ? ` Còn ${formatVnd(hang.tiep.thieu)} nữa lên hạng ${hang.tiep.hang}.`
                      : " Bạn đang ở hạng cao nhất."
                    : ""}
                </p>
              </section>

              <nav aria-label="Mục tài khoản" className="flex flex-col border-t border-hairline">
                {TABS.map((t) => (
                  <Link
                    key={t.key}
                    href={("/tai-khoan?tab=" + t.key) as Route}
                    aria-current={tab === t.key ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center border-b border-hairline px-3.5 text-[13.5px]",
                      tab === t.key ? "bg-neutral-900 font-extrabold text-bg" : "hover:bg-subtle",
                    )}
                  >
                    {t.ten}
                    {t.key === "yeu-thich" && yeuThich.length > 0 ? (
                      <span className="ml-auto font-mono text-[12px]">{yeuThich.length}</span>
                    ) : null}
                    {t.key === "dia-chi" && diaChi.length > 0 ? (
                      <span className="ml-auto font-mono text-[12px]">{diaChi.length}</span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </aside>

            <div>
              {tab === "don-hang" ? (
                <>
                  <h2 className="mb-4 border-b-2 border-divider pb-3 text-[20px]">Lịch sử đơn hàng</h2>
                  {orders.length === 0 ? (
                    <p className="border border-dashed border-border-soft bg-subtle px-5 py-10 text-[14px] text-muted">
                      Bạn chưa có đơn nào.{" "}
                      <Link href="/san-pham" className="font-semibold underline">
                        Xem sản phẩm
                      </Link>
                      .
                    </p>
                  ) : (
                    <ul className="border-t border-hairline">
                      {orders.map((o) => (
                        <li
                          key={o.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-hairline py-3.5"
                        >
                          <Link
                            href={
                              ("/tra-cuu-don?ma=" + o.code + "&sdt=" + o.phone.slice(-4)) as Route
                            }
                            className="font-mono text-[13px] font-bold underline"
                          >
                            {o.code}
                          </Link>
                          <span className="text-[13px]">{STATUS_LABEL[o.status] ?? o.status}</span>
                          <span className="text-[13px] text-muted">{formatDate(o.createdAt)}</span>
                          <span className="ml-auto text-[14px] font-extrabold">
                            {formatVnd(o.total)}
                          </span>
                          {/* Huỷ được thì cho huỷ ngay tại đây, không bắt gọi hotline. */}
                          {HUY_DUOC.includes(o.status) ? (
                            <span className="w-full sm:w-auto">
                              <CancelOrderButton code={o.code} />
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}

                  <h2 className="mb-4 mt-10 border-b-2 border-divider pb-3 text-[20px]">Sổ điểm</h2>
                  <ul className="border-t border-hairline">
                    {points.entries.map((e) => (
                      <li key={e.id} className="flex flex-wrap gap-x-4 border-b border-hairline py-3">
                        <span className="text-[13.5px]">{REASON_LABEL[e.reason] ?? e.reason}</span>
                        {e.note ? <span className="text-[13px] text-muted">{e.note}</span> : null}
                        <span className="label-tech ml-auto">{formatDate(e.createdAt)}</span>
                        <span
                          className={
                            "w-16 text-right font-mono text-[13px] font-bold " +
                            (e.delta >= 0 ? "text-text" : "text-accent-700")
                          }
                        >
                          {e.delta >= 0 ? "+" : ""}
                          {e.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {tab === "ho-so" ? (
                <>
                  <h2 className="mb-5 border-b-2 border-divider pb-3 text-[20px]">Hồ sơ</h2>
                  <ProfileForm
                    ban={{ name: me.name, phone: me.phone ?? "", email: me.email ?? "" }}
                  />

                  <h2 className="mb-5 mt-12 border-b-2 border-divider pb-3 text-[20px]">
                    Đổi mật khẩu
                  </h2>
                  <PasswordForm />
                </>
              ) : null}

              {tab === "dia-chi" ? (
                <>
                  <h2 className="mb-5 border-b-2 border-divider pb-3 text-[20px]">Sổ địa chỉ</h2>
                  <AddressBook
                    danhSach={diaChi.map((d) => ({
                      id: d.id,
                      label: d.label,
                      receiver: d.receiver,
                      phone: d.phone,
                      province: d.province,
                      district: d.district,
                      ward: d.ward,
                      street: d.street,
                      isDefault: d.isDefault,
                    }))}
                  />
                </>
              ) : null}

              {tab === "yeu-thich" ? (
                <>
                  <h2 className="mb-5 border-b-2 border-divider pb-3 text-[20px]">
                    Sản phẩm yêu thích
                  </h2>
                  {yeuThich.length === 0 ? (
                    <p className="border border-dashed border-border-soft bg-subtle px-5 py-10 text-[14px] text-muted">
                      Chưa có sản phẩm nào. Bấm{" "}
                      <strong className="font-extrabold">YÊU THÍCH</strong> ở trang sản phẩm để lưu
                      lại xem sau.
                    </p>
                  ) : (
                    <ProductGrid products={yeuThich} />
                  )}
                </>
              ) : null}
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
