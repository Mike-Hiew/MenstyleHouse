/**
 * Trích mockup ra dạng đọc và grep được.
 *
 * `docs/mockup/mockup.html` là một bundle 3MB, trong đó markup nằm dưới dạng
 * chuỗi JS đã escape (`/` cho `/`). Grep thẳng vào nó gần như vô dụng.
 *
 * ── Vì sao script này tồn tại, và vì sao nó tự kiểm chứng ──────────────────
 *
 * Bản đầu tiên chỉ cắt vùng markup (từ `<sc-if` đầu tới `</sc-if>` cuối) rồi
 * gọi đó là "mockup". Nhưng mockup có **hai nửa**:
 *
 *   - *markup*  — khung HTML, trong đó mọi nhãn là placeholder `{{ n.label }}`
 *   - *dữ liệu* — `navItems`, cấu hình từng bảng, `D.cats`, `D.brands`, danh
 *                 sách trường của từng form… nằm trong phần JS, **ngoài** lát cắt
 *
 * Hệ quả: hỏi bản trích "mockup có mục sidebar Danh mục không" thì luôn nhận
 * được *không*, kể cả khi có — vì nhãn sidebar chưa bao giờ nằm trong đó. Đã
 * có một lần tôi tin đúng câu trả lời rỗng đó và kết luận sai.
 *
 * Nên script giờ trích cả hai nửa, và **tự chạy một phép thử đối chứng**: tìm
 * vài chuỗi chắc chắn phải có. Thiếu một cái là hỏng ngay, chứ không im lặng
 * trả về một file thiếu dữ liệu mà trông vẫn bình thường.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const thuMuc = (ten) => fileURLToPath(new URL("../docs/mockup/" + ten, import.meta.url));

const GOC = thuMuc("mockup.html");
const RA_MARKUP = thuMuc("trich-markup.html");
const RA_DAY_DU = thuMuc("trich-day-du.txt");

/**
 * Chuỗi bắt buộc phải tìm thấy trong bản trích đầy đủ.
 *
 * Chọn cố ý: nhãn sidebar chỉ có trong *dữ liệu*, thẻ `<sc-if` chỉ có trong
 * *markup*. Đủ cả hai nghĩa là không nửa nào bị đánh rơi.
 */
const PHAI_CO = [
  "navItems", // danh sách mục sidebar
  "Khuyến mãi", // một nhãn sidebar — nằm trong dữ liệu, không có trong markup
  "actionLabel", // nút hành động chính của bảng
  "<sc-if", // markup
  "HOÁ ĐƠN GTGT", // chữ cứng trong markup
];

function giaiEscape(s) {
  return s
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003C/gi, "<")
    .replace(/\\u003E/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0027/gi, "'")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

const raw = fs.readFileSync(GOC, "utf8");

// 1. Bản đầy đủ: giải escape toàn bộ, không cắt gì. Đây mới là thứ để grep.
const dayDu = giaiEscape(raw);
fs.writeFileSync(RA_DAY_DU, dayDu, "utf8");

// 2. Bản markup: cắt riêng cho dễ đọc bố cục. Tiện thôi, không phải nguồn tra cứu.
const dau = dayDu.indexOf("<sc-if");
const cuoi = dayDu.lastIndexOf("</sc-if>");
if (dau !== -1 && cuoi !== -1) {
  fs.writeFileSync(RA_MARKUP, dayDu.slice(dau, cuoi + 8), "utf8");
}

// 3. Phép thử đối chứng — thiếu chuỗi nào thì dừng, không trả file thiếu.
const thieu = PHAI_CO.filter((s) => !dayDu.includes(s));
if (thieu.length > 0) {
  console.error("Bản trích thiếu:", thieu.join(", "));
  console.error("Không dùng nó để kết luận mockup có gì hay không có gì.");
  process.exit(1);
}

console.log("Đầy đủ (dùng cái này để tra cứu):", RA_DAY_DU, dayDu.length, "ký tự");
console.log("Markup (dễ đọc bố cục):        ", RA_MARKUP);
console.log("Đối chứng đạt:", PHAI_CO.join(" · "));
