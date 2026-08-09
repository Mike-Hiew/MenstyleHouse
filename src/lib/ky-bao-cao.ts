/**
 * Khoảng thời gian cho báo cáo.
 *
 * Trước đó mọi con số cố định 12 tháng — kế toán cần "quý này", "tháng trước",
 * hoặc một khoảng tự chọn để đối chiếu với sổ sách, chứ không phải một con số
 * gộp cả năm.
 *
 * Mốc là **lúc đặt đơn**, cùng luật với `TINH_DA_BAN`: đơn đặt cuối tháng 7
 * giao đầu tháng 8 vẫn thuộc tháng 7.
 */

export const KY = {
  "thang-nay": "Tháng này",
  "thang-truoc": "Tháng trước",
  "quy-nay": "Quý này",
  "nam-nay": "Năm nay",
  "12-thang": "12 tháng gần nhất",
  tuy: "Tự chọn",
} as const;

export type KyKey = keyof typeof KY;

export type Khoang = { tu: Date; den: Date; nhan: string };

const dauNgay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const cuoiNgay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Đọc ngày `YYYY-MM-DD`; sai định dạng thì trả `null` chứ không ném. */
function docNgay(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Dựng khoảng từ query string.
 *
 * URL do người dùng sửa tay **không được làm sập trang**: giá trị lạ rơi về
 * mặc định 12 tháng. Ngày bắt đầu sau ngày kết thúc thì đảo lại, giống cách
 * `parseCatalogQuery` xử lý khoảng giá nhập ngược.
 */
export function docKhoang(raw: { ky?: string; tu?: string; den?: string }, moc = new Date()): Khoang {
  const ky = (Object.keys(KY) as KyKey[]).includes(raw.ky as KyKey) ? (raw.ky as KyKey) : "12-thang";

  if (ky === "tuy") {
    let tu = docNgay(raw.tu);
    let den = docNgay(raw.den);
    if (tu && den && tu > den) [tu, den] = [den, tu];
    if (tu || den) {
      const a = dauNgay(tu ?? den!);
      const b = cuoiNgay(den ?? tu!);
      return { tu: a, den: b, nhan: `${vn(a)} – ${vn(b)}` };
    }
  }

  const den = cuoiNgay(moc);

  if (ky === "thang-nay") {
    return { tu: dauNgay(new Date(moc.getFullYear(), moc.getMonth(), 1)), den, nhan: KY["thang-nay"] };
  }
  if (ky === "thang-truoc") {
    const tu = dauNgay(new Date(moc.getFullYear(), moc.getMonth() - 1, 1));
    return {
      tu,
      den: cuoiNgay(new Date(moc.getFullYear(), moc.getMonth(), 0)),
      nhan: KY["thang-truoc"],
    };
  }
  if (ky === "quy-nay") {
    const quy = Math.floor(moc.getMonth() / 3) * 3;
    return { tu: dauNgay(new Date(moc.getFullYear(), quy, 1)), den, nhan: KY["quy-nay"] };
  }
  if (ky === "nam-nay") {
    return { tu: dauNgay(new Date(moc.getFullYear(), 0, 1)), den, nhan: KY["nam-nay"] };
  }

  const tu = dauNgay(new Date(moc.getFullYear(), moc.getMonth() - 11, 1));
  return { tu, den, nhan: KY["12-thang"] };
}

/** Số tháng mà khoảng này chạm vào — để dựng bảng doanh thu theo tháng. */
export function soThangCua(k: Khoang): number {
  return (
    (k.den.getFullYear() - k.tu.getFullYear()) * 12 + (k.den.getMonth() - k.tu.getMonth()) + 1
  );
}

function vn(d: Date) {
  return d.toLocaleDateString("vi-VN");
}
