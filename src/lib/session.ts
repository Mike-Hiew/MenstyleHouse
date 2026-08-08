/**
 * Phiên đăng nhập còn sống hay không.
 *
 * Phiên là **JWT**, không có bảng session để xoá từng dòng — đó không phải lười
 * mà là ràng buộc: Auth.js chỉ cho dùng phiên lưu DB khi đăng nhập qua provider
 * bên ngoài, còn provider `credentials` (số điện thoại + mật khẩu, thứ cửa hàng
 * đang dùng) bắt buộc dùng JWT.
 *
 * Nên thu hồi phiên làm theo cách khác: mỗi người có một mốc thời gian
 * `sessionsValidFrom`; token phát trước mốc đó coi như chết. Đổi mật khẩu đẩy
 * mốc lên, và thế là mọi phiên đang mở ở mọi máy khác tắt cùng lúc.
 */

export type TrangThaiPhien = {
  active: boolean;
  sessionsValidFrom: Date;
};

/**
 * `iat` là giây (theo chuẩn JWT), `sessionsValidFrom` là mốc có mili-giây.
 *
 * So sánh phải **cắt cả hai về giây**, không được để nguyên mili-giây. Nếu
 * không: đổi mật khẩu lúc 12:00:00.700 rồi đăng nhập lại lúc 12:00:00.900 sẽ
 * cho token `iat = 12:00:00.000` — nhỏ hơn mốc, và người vừa đổi mật khẩu bị đá
 * ra ngay tại giây đăng nhập. Đổi lại, một token phát **trong cùng giây** với
 * lúc đổi mật khẩu sẽ sống sót; cửa sổ đó rộng đúng một giây và đáng đánh đổi
 * hơn là tự đá người dùng ra khỏi phiên họ vừa mở.
 */
export function phienConSong(u: TrangThaiPhien, iat: number | undefined): boolean {
  if (!u.active) return false;
  // Token cũ chưa có `iat` thì không chứng minh được là phát sau mốc.
  if (typeof iat !== "number") return false;
  return iat >= Math.floor(u.sessionsValidFrom.getTime() / 1000);
}
