import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/storefront/header";
import { SiteFooter } from "@/components/storefront/site-footer";
import { Container, Crumbs } from "@/components/storefront/shell";
import { getSettings } from "@/server/settings";
import { formatVnd } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Ba trang chính sách. Trước đây footer trỏ cả ba về `/ho-tro`, tức là khách
 * bấm "Chính sách đổi trả" thì ra một form liên hệ — không trả lời được câu hỏi
 * họ bấm vào để hỏi. Bán hàng online ở Việt Nam cũng cần công bố những mục này.
 *
 * Nội dung lấy số liệu từ **cài đặt cửa hàng** chứ không viết cứng: đổi phí
 * ship hay hotline trong `/admin/cai-dat` thì trang chính sách đổi theo, không
 * để tình trạng chính sách nói một đằng hệ thống tính một nẻo.
 */
const MUC = {
  "doi-tra": "Chính sách đổi trả",
  "bao-mat": "Chính sách bảo mật",
  "van-chuyen": "Chính sách vận chuyển",
} as const;

type Muc = keyof typeof MUC;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ muc: string }>;
}): Promise<Metadata> {
  const { muc } = await params;
  const ten = MUC[muc as Muc];
  return { title: ten ? `${ten} — Men Style House` : "Không tìm thấy" };
}

export default async function PolicyPage({ params }: { params: Promise<{ muc: string }> }) {
  const { muc } = await params;
  if (!(muc in MUC)) notFound();
  const key = muc as Muc;

  const s = await getSettings();

  return (
    <>
      <Header />
      <main>
        <Container narrow className="pb-16 pt-6">
          <Crumbs parts={["TRANG CHỦ", MUC[key].toUpperCase()]} />
          <h1 className="mb-7 text-[28px] lg:text-[40px]">{MUC[key]}</h1>

          <div className="max-w-[680px] text-[15px] leading-[1.75]">
            {key === "doi-tra" ? <DoiTra s={s} /> : null}
            {key === "bao-mat" ? <BaoMat s={s} /> : null}
            {key === "van-chuyen" ? <VanChuyen s={s} /> : null}
          </div>

          <p className="mt-10 border-t border-hairline pt-5 text-[14px] text-muted">
            Còn thắc mắc?{" "}
            <Link href="/ho-tro" className="font-semibold text-accent-700 underline">
              Gửi yêu cầu hỗ trợ
            </Link>{" "}
            hoặc gọi <span className="font-mono">{s.hotline}</span>.
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

type CaiDat = Awaited<ReturnType<typeof getSettings>>;

function Muc2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-8 text-[20px] first:mt-0">{children}</h2>;
}

function DoiTra({ s }: { s: CaiDat }) {
  return (
    <>
      <Muc2>Đổi size miễn phí trong 15 ngày</Muc2>
      <p>
        Hàng còn nguyên tem mác, chưa giặt, không bẩn hay ám mùi thì đổi size miễn phí trong 15 ngày
        kể từ ngày nhận. Cửa hàng chịu phí giao lượt đổi.
      </p>

      <Muc2>Trả hàng khi lỗi từ cửa hàng</Muc2>
      <p>
        Giao sai mẫu, sai size, thiếu hàng hoặc sản phẩm có lỗi may — cửa hàng thu hồi và hoàn tiền
        đầy đủ, kể cả phí giao. Chụp giúp ảnh tình trạng khi nhận để xử lý nhanh.
      </p>

      <Muc2>Trường hợp không áp dụng</Muc2>
      <ul className="list-disc pl-5">
        <li>Hàng đã qua sử dụng, đã giặt, có mùi hoặc vết bẩn.</li>
        <li>Mất tem mác hoặc hư hộp/túi đựng.</li>
        <li>Đồ lót và phụ kiện dùng trực tiếp trên da, vì lý do vệ sinh.</li>
      </ul>

      <Muc2>Cách đổi trả</Muc2>
      <p>
        Gọi <span className="font-mono">{s.hotline}</span> hoặc gửi yêu cầu ở trang Hỗ trợ, kèm mã
        đơn. Cửa hàng hẹn lấy hàng tại nhà hoặc bạn mang tới {s.address}.
      </p>

      <Muc2>Hoàn tiền</Muc2>
      <p>
        Chuyển khoản trong 3–5 ngày làm việc kể từ khi cửa hàng nhận lại hàng và kiểm xong. Đơn
        thanh toán khi nhận hàng thì hoàn về tài khoản bạn cung cấp.
      </p>
    </>
  );
}

function BaoMat({ s }: { s: CaiDat }) {
  return (
    <>
      <Muc2>Cửa hàng thu thập gì</Muc2>
      <p>
        Chỉ những thứ cần để giao được đơn: họ tên, số điện thoại, địa chỉ nhận hàng, và email nếu
        bạn cung cấp. Đặt hàng **không bắt buộc** phải có tài khoản.
      </p>

      <Muc2>Dùng để làm gì</Muc2>
      <ul className="list-disc pl-5">
        <li>Giao hàng và liên hệ khi đơn có vấn đề.</li>
        <li>Gửi xác nhận đơn, hoá đơn và phản hồi hỗ trợ.</li>
        <li>Tính điểm thưởng và hạng thành viên nếu bạn có tài khoản.</li>
        <li>Gửi tin khuyến mãi — chỉ khi bạn tự đăng ký, và huỷ được bất cứ lúc nào.</li>
      </ul>

      <Muc2>Mật khẩu</Muc2>
      <p>
        Mật khẩu được băm một chiều; cửa hàng <strong>không</strong> đọc được mật khẩu của bạn và
        không có màn nào xem lại. Quên thì đặt lại qua email, đường dẫn đặt lại dùng một lần và hết
        hạn sau một giờ.
      </p>

      <Muc2>Chia sẻ với ai</Muc2>
      <p>
        Chỉ đơn vị vận chuyển (để giao hàng) và cơ quan thuế (khi bạn yêu cầu hoá đơn GTGT). Cửa
        hàng không bán hay trao đổi dữ liệu khách hàng với bên thứ ba.
      </p>

      <Muc2>Quyền của bạn</Muc2>
      <p>
        Xem và sửa thông tin trong trang Tài khoản. Muốn xoá tài khoản, gọi{" "}
        <span className="font-mono">{s.hotline}</span> — cửa hàng giữ lại phần dữ liệu bắt buộc theo
        quy định về hoá đơn, phần còn lại xoá.
      </p>
    </>
  );
}

function VanChuyen({ s }: { s: CaiDat }) {
  return (
    <>
      <Muc2>Thời gian giao</Muc2>
      <p>Nội thành 1–2 ngày làm việc, tỉnh khác 2–4 ngày, tính từ khi đơn được xác nhận.</p>

      <Muc2>Phí giao hàng</Muc2>
      <p>
        Nội thành {formatVnd(s.shipInnerCity)}, ngoại tỉnh {formatVnd(s.shipProvince)}. Miễn phí giao
        cho đơn từ {formatVnd(s.freeShipFrom)}.
      </p>

      <Muc2>Theo dõi đơn</Muc2>
      <p>
        Vào trang Tra cứu đơn, nhập mã đơn và 4 số cuối số điện thoại đặt hàng — không cần đăng
        nhập. Khi cửa hàng bàn giao cho đơn vị vận chuyển, mã vận đơn sẽ hiện ở đó.
      </p>

      <Muc2>Nhận hàng</Muc2>
      <p>
        Kiểm hàng trước khi thanh toán. Nếu sai mẫu hay thiếu hàng, từ chối nhận và gọi{" "}
        <span className="font-mono">{s.hotline}</span> — cửa hàng xử lý ngay.
      </p>
    </>
  );
}
