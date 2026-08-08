import Link from "next/link";
import type { Route } from "next";
import { Container } from "./shell";

/** Footer theo mockup: nền khối phụ, cột giới thiệu rộng hơn, đáy mono. */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "MUA SẮM",
    links: [
      { label: "Tất cả sản phẩm", href: "/san-pham" },
      { label: "Hàng sale", href: "/san-pham?km=1" },
      { label: "Hướng dẫn chọn size", href: "/san-pham" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Tra cứu đơn hàng", href: "/tra-cuu-don" },
      { label: "Chính sách vận chuyển", href: "/chinh-sach/van-chuyen" },
      { label: "Chính sách đổi trả", href: "/chinh-sach/doi-tra" },
      { label: "Chính sách bảo mật", href: "/chinh-sach/bao-mat" },
      { label: "Liên hệ & FAQ", href: "/ho-tro" },
    ],
  },
  {
    title: "CỬA HÀNG",
    links: [
      // Giới thiệu cửa hàng = trang chủ (mockup: `['Giới thiệu cửa hàng','home']`).
      { label: "Giới thiệu cửa hàng", href: "/" },
      { label: "Tài khoản của bạn", href: "/tai-khoan" },
      // Chưa có trang tuyển dụng; đưa về form liên hệ như ba link chính sách,
      // thay vì thả về trang chủ như mockup — trang chủ không trả lời được câu
      // hỏi người ta bấm vào để hỏi.
      { label: "Tuyển dụng", href: "/ho-tro" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-divider bg-subtle">
      <Container className="grid grid-cols-1 gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-0">
        <div className="md:pr-8">
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="block h-5 w-5 bg-accent" aria-hidden />
            <span className="text-[16px] font-extrabold uppercase tracking-[-0.02em]">
              Men Style House
            </span>
          </div>
          <p className="text-[13.5px] leading-[1.7] text-muted">
            Đồ nam cơ bản, form chuẩn người Việt.
            <br />
            142 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM
            <br />
            1900 6060 · cskh@menstylehouse.vn
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="label-tech mb-3.5 font-bold tracking-[0.12em]">{col.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href as Route}
                    className="flex min-h-11 items-center text-[13.5px] hover:text-accent-700 lg:min-h-0"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-hairline">
        <Container className="label-tech flex flex-wrap justify-between gap-2 py-4.5 font-bold">
          <span>© 2026 MEN STYLE HOUSE — MST 0316 998 221</span>
          <span>GIÁ ĐÃ GỒM VAT</span>
        </Container>
      </div>
    </footer>
  );
}
