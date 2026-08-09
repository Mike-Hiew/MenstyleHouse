import "server-only";
import { appUrl, guiMail, type MailResult } from "@/server/mail";
import { formatVnd } from "@/lib/money";

/**
 * Nội dung từng loại mail.
 *
 * Tách khỏi chỗ gọi để sửa câu chữ không phải đụng vào mã nghiệp vụ, và để
 * mọi mail dùng chung một giọng: xưng "cửa hàng", không hô hào, luôn kèm thứ
 * người nhận cần cầm theo (mã đơn, mã yêu cầu, đường dẫn).
 *
 * Mail nào cũng ghi rõ **không trả lời vào địa chỉ này** — hộp thư gửi đi là
 * `no-reply`, khách trả lời vào đó là rơi vào hư không.
 */

const CHAN = (hotline: string) =>
  `\n\n—\nMen Style House · ${hotline}\nMail tự động, vui lòng không trả lời thư này.`;

/** Mời một người vào khu quản trị. */
export function mailMoiNhanVien(input: {
  to: string;
  vaiTro: string;
  token: string;
  nguoiMoi: string;
  hotline: string;
}): Promise<MailResult> {
  const link = `${appUrl()}/nhan-loi-moi/${input.token}`;
  return guiMail({
    to: input.to,
    loai: "moi-nhan-vien",
    subject: "Lời mời tham gia quản trị Men Style House",
    body:
      `Chào bạn,\n\n` +
      `${input.nguoiMoi} mời bạn vào khu quản trị Men Style House với vai trò ${input.vaiTro}.\n\n` +
      `Mở đường dẫn sau để đặt mật khẩu và bắt đầu:\n${link}\n\n` +
      `Đường dẫn hết hạn sau 7 ngày. Nếu bạn không chờ lời mời nào, bỏ qua thư này.` +
      CHAN(input.hotline),
  });
}

/** Xác nhận đã nhận đơn. */
export function mailXacNhanDon(input: {
  to: string;
  ten: string;
  maDon: string;
  tong: number;
  hinhThuc: string;
  hotline: string;
}): Promise<MailResult> {
  return guiMail({
    to: input.to,
    loai: "xac-nhan-don",
    subject: `Đã nhận đơn ${input.maDon} — Men Style House`,
    body:
      `Chào ${input.ten},\n\n` +
      `Cửa hàng đã nhận đơn của bạn.\n\n` +
      `Mã đơn:        ${input.maDon}\n` +
      `Tổng thanh toán: ${formatVnd(input.tong)}\n` +
      `Hình thức:      ${input.hinhThuc}\n\n` +
      `Theo dõi đơn tại:\n${appUrl()}/tra-cuu-don\n` +
      `Nhập mã đơn và 4 số cuối điện thoại đặt hàng.` +
      CHAN(input.hotline),
  });
}

/** Báo cho khách khi cửa hàng trả lời yêu cầu hỗ trợ. */
export function mailTraLoiHoTro(input: {
  to: string;
  maYeuCau: string;
  tieuDe: string;
  noiDung: string;
  hotline: string;
}): Promise<MailResult> {
  return guiMail({
    to: input.to,
    loai: "tra-loi-ho-tro",
    subject: `Phản hồi yêu cầu ${input.maYeuCau} — Men Style House`,
    body:
      `Chào bạn,\n\n` +
      `Cửa hàng đã phản hồi yêu cầu "${input.tieuDe}" (mã ${input.maYeuCau}):\n\n` +
      `${input.noiDung}\n\n` +
      `Xem lại toàn bộ trao đổi tại:
${appUrl()}/ho-tro/tra-cuu?ma=${input.maYeuCau}

` +
      `Cần trao đổi tiếp thì gửi yêu cầu mới tại ${appUrl()}/ho-tro, ` +
      `ghi kèm mã ${input.maYeuCau}.` +
      CHAN(input.hotline),
  });
}

/** Báo hoá đơn GTGT đã phát hành. */
export function mailHoaDon(input: {
  to: string;
  nguoiMua: string;
  kyHieu: string;
  so: string;
  maDon: string;
  tong: number;
  hotline: string;
}): Promise<MailResult> {
  return guiMail({
    to: input.to,
    loai: "hoa-don",
    subject: `Hoá đơn GTGT ${input.so} — Men Style House`,
    body:
      `Chào ${input.nguoiMua},\n\n` +
      `Cửa hàng đã phát hành hoá đơn GTGT cho đơn ${input.maDon}.\n\n` +
      `Ký hiệu: ${input.kyHieu}\n` +
      `Số:      ${input.so}\n` +
      `Tổng:    ${formatVnd(input.tong)}\n\n` +
      `Cần bản in, liên hệ cửa hàng theo số bên dưới.` +
      CHAN(input.hotline),
  });
}

/** Đường dẫn đặt lại mật khẩu. */
export function mailDatLaiMatKhau(input: {
  to: string;
  ten: string;
  token: string;
  hotline: string;
}): Promise<MailResult> {
  const link = `${appUrl()}/dat-lai-mat-khau/${input.token}`;
  return guiMail({
    to: input.to,
    loai: "dat-lai-mat-khau",
    subject: "Đặt lại mật khẩu — Men Style House",
    body:
      `Chào ${input.ten},\n\n` +
      `Có người yêu cầu đặt lại mật khẩu cho tài khoản này. Mở đường dẫn sau để ` +
      `đặt mật khẩu mới:\n${link}\n\n` +
      `Đường dẫn dùng được **một lần** và hết hạn sau 1 giờ.\n\n` +
      `Nếu không phải bạn yêu cầu, bỏ qua thư này — mật khẩu hiện tại vẫn nguyên ` +
      `và không ai vào được tài khoản của bạn bằng thư này.` +
      CHAN(input.hotline),
  });
}

/** Báo khách khi đơn đổi sang một nấc đáng để biết. */
export function mailTrangThaiDon(input: {
  to: string;
  ten: string;
  maDon: string;
  trangThai: "SHIPPING" | "DELIVERED" | "CANCELLED";
  maVanDon?: string | null;
  hangVanChuyen?: string | null;
  hotline: string;
}): Promise<MailResult> {
  const noi = {
    SHIPPING: {
      subject: `Đơn ${input.maDon} đang trên đường tới bạn`,
      than:
        `Đơn của bạn đã rời cửa hàng.\n\n` +
        (input.maVanDon
          ? `Mã vận đơn: ${input.maVanDon}${input.hangVanChuyen ? ` (${input.hangVanChuyen})` : ""}\n\n`
          : "") +
        `Bạn kiểm hàng trước khi thanh toán giúp nhé. Sai mẫu hay thiếu hàng thì từ chối nhận ` +
        `và gọi cửa hàng ngay.`,
    },
    DELIVERED: {
      subject: `Đơn ${input.maDon} đã giao xong`,
      than:
        `Cửa hàng đã giao xong đơn của bạn. Cảm ơn bạn đã mua hàng.\n\n` +
        `Đổi size miễn phí trong 15 ngày nếu chưa vừa — hàng còn tem mác và chưa giặt.\n\n` +
        `Nếu tiện, bạn để lại vài dòng đánh giá ở trang sản phẩm; người mua sau đọc để chọn size.`,
    },
    CANCELLED: {
      subject: `Đơn ${input.maDon} đã huỷ`,
      than:
        `Đơn của bạn đã được huỷ và hàng đã trả lại kho.\n\n` +
        `Nếu bạn đã chuyển khoản, cửa hàng hoàn tiền trong 3–5 ngày làm việc. ` +
        `Không phải bạn huỷ thì gọi cửa hàng ngay giúp.`,
    },
  }[input.trangThai];

  return guiMail({
    to: input.to,
    loai: "trang-thai-don",
    subject: noi.subject + " — Men Style House",
    body:
      `Chào ${input.ten},\n\n` +
      noi.than +
      `\n\nTheo dõi đơn tại:\n${appUrl()}/tra-cuu-don` +
      CHAN(input.hotline),
  });
}
