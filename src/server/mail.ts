import "server-only";

/**
 * Gửi email.
 *
 * ── Ba quyết định đứng sau file này ────────────────────────────────────────
 *
 * 1. **Mặc định là `console`: ghi ra log, không gửi đi đâu.** Chưa có khoá thì
 *    phải thấy rõ là chưa gửi. Im lặng nuốt rồi báo "đã gửi" là kiểu hỏng tệ
 *    nhất — cửa hàng tưởng khách đã nhận hoá đơn trong khi không có gì rời máy.
 *
 * 2. **Gửi mail không bao giờ làm hỏng việc chính.** Đặt đơn xong mà nhà cung
 *    cấp mail chết thì đơn vẫn phải thành công. Nên `guiMail` **không ném lỗi**;
 *    nó trả về kết quả và ghi log để còn tra.
 *
 * 3. **Không phụ thuộc thư viện nào.** Resend gọi bằng HTTPS thuần, chạy được
 *    trên mọi nơi kể cả runtime không có socket TCP.
 */

export type MailInput = {
  to: string;
  subject: string;
  /** Nội dung thuần. Bản HTML dựng từ đây, xuống dòng thành `<br>`. */
  body: string;
  /** Ghi vào log để tra "mail nào của việc gì". */
  loai: string;
};

export type MailResult =
  | { ok: true; provider: string; id?: string }
  | { ok: false; provider: string; error: string };

function nhaCungCap(): "console" | "resend" {
  const v = (process.env.MAIL_PROVIDER ?? "console").trim().toLowerCase();
  return v === "resend" ? "resend" : "console";
}

/** Địa chỉ gốc để dựng link tuyệt đối trong mail — mail không có "trang hiện tại". */
export function appUrl(): string {
  const v = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return v.replace(/\/+$/, "");
}

const NGUOI_GUI = () =>
  process.env.MAIL_FROM?.trim() || "Men Style House <no-reply@menstylehouse.vn>";

/** Bản HTML tối giản: mail client nào cũng đọc được, không ảnh, không CSS ngoài. */
function thanhHtml(body: string) {
  const thoat = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#201e1d">${thoat.replace(/\n/g, "<br>")}</div>`;
}

async function guiQuaResend(input: MailInput): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, provider: "resend", error: "Chưa đặt RESEND_API_KEY" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NGUOI_GUI(),
        to: [input.to],
        subject: input.subject,
        text: input.body,
        html: thanhHtml(input.body),
      }),
    });

    if (!res.ok) {
      return { ok: false, provider: "resend", error: `HTTP ${res.status} ${await res.text()}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  } catch (e) {
    return { ok: false, provider: "resend", error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Gửi một email. **Không ném lỗi** — xem lý do ở đầu file.
 *
 * Nơi gọi quyết định có nói gì với người dùng hay không. Việc mời nhân viên thì
 * nên báo "gửi không được, đây là đường dẫn, bạn gửi tay giúp"; còn xác nhận
 * đơn thì im lặng ghi log, vì khách đã có mã đơn trên màn hình rồi.
 */
export async function guiMail(input: MailInput): Promise<MailResult> {
  const provider = nhaCungCap();

  if (provider === "console") {
    // Ghi đủ nội dung: dev đọc log là biết khách lẽ ra nhận được gì.
    console.info(
      [
        "",
        "──────── MAIL (chưa gửi thật — MAIL_PROVIDER=console) ────────",
        `Loại:     ${input.loai}`,
        `Tới:      ${input.to}`,
        `Tiêu đề:  ${input.subject}`,
        "",
        input.body,
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { ok: true, provider: "console" };
  }

  const ket = await guiQuaResend(input);
  if (!ket.ok) console.error("[mail] gửi hỏng:", input.loai, "→", input.to, "·", ket.error);
  return ket;
}

/** Đang bật gửi thật hay chưa — dùng để UI nói đúng sự thật với người dùng. */
export function guiMailThat(): boolean {
  return nhaCungCap() !== "console";
}
