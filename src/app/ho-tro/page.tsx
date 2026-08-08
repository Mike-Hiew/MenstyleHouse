import type { Metadata } from "next";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { SupportForm } from "@/components/storefront/support-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liên hệ & hỗ trợ — Men Style House",
  description: "Gửi yêu cầu đổi trả, bảo hành hoặc hỏi về đơn hàng tại Men Style House.",
};

const FAQ = [
  {
    hoi: "Đổi size thì làm thế nào?",
    dap: "Đổi size miễn phí trong 15 ngày, sản phẩm còn nguyên tem mác và chưa qua giặt. Gửi yêu cầu kèm mã đơn, cửa hàng sẽ hẹn lịch lấy hàng.",
  },
  {
    hoi: "Bao lâu thì nhận được hàng?",
    dap: "Nội thành TP.HCM và Hà Nội 1–2 ngày, các tỉnh còn lại 2–4 ngày. Đơn từ 500.000 ₫ được miễn phí giao.",
  },
  {
    hoi: "Thanh toán được bằng cách nào?",
    dap: "Thanh toán khi nhận hàng (COD) hoặc chuyển khoản ngân hàng. Chuyển khoản thì ghi mã đơn vào nội dung, cửa hàng xác nhận khi tiền về.",
  },
  {
    hoi: "Tôi cần hoá đơn công ty (VAT)?",
    dap: "Tích ô “Xuất hoá đơn công ty (VAT)” ở bước thanh toán và điền mã số thuế. Kế toán phát hành hoá đơn sau khi đơn được xác nhận.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Header />

      <main>
        <Container className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", "LIÊN HỆ & HỖ TRỢ"]} />

          <div className="grid items-start gap-12 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="mb-3 text-[32px] leading-[1.1] lg:text-[44px]">Liên hệ &amp; hỗ trợ</h1>
              <p className="mb-8 max-w-[560px] text-[15px] leading-[1.7] text-muted">
                Gửi yêu cầu ở đây, cửa hàng trả lời trong giờ hành chính. Có mã đơn thì điền vào
                giúp — tra được đơn thì xử lý nhanh hơn hẳn.
              </p>

              <SupportForm />
            </div>

            <aside>
              <div className="border-2 border-divider bg-surface p-5">
                <p className="label-tech mb-3 font-bold">GỌI TRỰC TIẾP</p>
                <p className="font-mono text-[20px] font-bold">1900 6060</p>
                <p className="mt-1 text-[13px] text-muted">8:00 – 21:00 mỗi ngày</p>
                <p className="mt-4 border-t border-hairline pt-4 text-[13.5px] leading-[1.7] text-muted">
                  142 Nguyễn Văn Trỗi, P.8
                  <br />
                  Q. Phú Nhuận, TP.HCM
                  <br />
                  cskh@menstylehouse.vn
                </p>
              </div>
            </aside>
          </div>

          <section className="mt-14 border-t-2 border-divider pt-8">
            <h2 className="mb-6 text-[28px]">Câu hỏi thường gặp</h2>
            <div className="grid gap-x-12 gap-y-7 md:grid-cols-2">
              {FAQ.map((f) => (
                <div key={f.hoi}>
                  <h3 className="mb-2 text-[15.5px] font-extrabold">{f.hoi}</h3>
                  <p className="text-[14px] leading-[1.7] text-muted">{f.dap}</p>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
