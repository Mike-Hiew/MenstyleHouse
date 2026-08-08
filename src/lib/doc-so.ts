/**
 * Đọc số tiền thành chữ tiếng Việt — dòng "Số tiền bằng chữ" bắt buộc có trên
 * hoá đơn GTGT.
 *
 * Đọc theo giọng miền Nam ("lẻ" chứ không "linh") vì cửa hàng ở TP.HCM, và
 * dùng "mốt / tư / lăm" như phần mềm hoá đơn điện tử trong nước.
 *
 * Tiền là `Int` đồng nên trần là Int32 ≈ 2,1 tỷ — không cần tới "nghìn tỷ".
 */

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const HANG = ["", "nghìn", "triệu", "tỷ"];

/**
 * Đọc một nhóm ba chữ số.
 *
 * `dauTien` là nhóm cao nhất của cả số. Nhóm không phải đầu tiên mà thiếu hàng
 * trăm vẫn phải đọc "không trăm", nếu không thì 1.000.067 nghe thành "một triệu
 * sáu mươi bảy" — mất luôn thông tin nó là hàng chục nghìn hay hàng chục.
 */
function docNhom(n: number, dauTien: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor(n / 10) % 10;
  const donVi = n % 10;
  const ra: string[] = [];

  if (tram > 0) ra.push(CHU_SO[tram], "trăm");
  else if (!dauTien) ra.push("không", "trăm");

  if (chuc > 1) {
    ra.push(CHU_SO[chuc], "mươi");
    if (donVi === 1) ra.push("mốt");
    else if (donVi === 4) ra.push("tư");
    else if (donVi === 5) ra.push("lăm");
    else if (donVi > 0) ra.push(CHU_SO[donVi]);
  } else if (chuc === 1) {
    ra.push("mười");
    if (donVi === 5) ra.push("lăm");
    else if (donVi > 0) ra.push(CHU_SO[donVi]);
  } else if (donVi > 0) {
    if (tram > 0 || !dauTien) ra.push("lẻ");
    ra.push(CHU_SO[donVi]);
  }

  return ra.join(" ");
}

/** "một triệu hai trăm ba mươi tư nghìn" — chưa viết hoa, chưa có "đồng". */
export function docSo(n: number): string {
  if (!Number.isInteger(n)) throw new Error("Chỉ đọc được số nguyên");
  if (n < 0) return "âm " + docSo(-n);
  if (n === 0) return "không";

  // Cắt thành các nhóm ba chữ số, nhóm cao nhất đứng trước.
  const nhom: number[] = [];
  for (let con = n; con > 0; con = Math.floor(con / 1000)) nhom.unshift(con % 1000);

  if (nhom.length > HANG.length) {
    throw new Error("Số vượt quá hàng tỷ, ngoài tầm tiền đồng kiểu Int");
  }

  return nhom
    .map((g, i) => {
      // Nhóm rỗng ở giữa thì bỏ hẳn: 1.000.567 là "một triệu năm trăm sáu mươi
      // bảy nghìn", không phải "một triệu không nghìn ...".
      if (g === 0) return "";
      const ten = HANG[nhom.length - 1 - i];
      return (docNhom(g, i === 0) + " " + ten).trim();
    })
    .filter(Boolean)
    .join(" ");
}

/** Dòng in trên hoá đơn: "Một triệu hai trăm ba mươi tư nghìn đồng". */
export function docTien(dong: number): string {
  const chu = docSo(dong);
  return chu.charAt(0).toUpperCase() + chu.slice(1) + " đồng";
}
