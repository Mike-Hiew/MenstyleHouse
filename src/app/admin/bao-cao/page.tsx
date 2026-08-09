import { DataTable, type ColumnMeta, type TableRow } from "@/components/admin/data-table";
import { requirePermission } from "@/server/admin/guard";
import { doanhThuTheoThang, laiGop, tongQuanBaoCao, topSanPham } from "@/server/admin/reports";
import { docKhoang, KY, type KyKey } from "@/lib/ky-bao-cao";
import { KyPicker } from "@/components/admin/ky-picker";
import { parseTableQuery, serializeTableQuery, type RawParams } from "@/lib/table-params";
import { formatVnd, formatVndPlain } from "@/lib/money";

export const dynamic = "force-dynamic";

/** Năm cột đúng màn `reports` trong mockup. */
const COLUMNS: ColumnMeta[] = [
  { key: "ky", label: "KỲ", card: "title" },
  { key: "doanhThu", label: "DOANH THU", align: "right", card: "foot-end" },
  { key: "soDon", label: "SỐ ĐƠN", align: "right", card: "foot" },
  { key: "gtdh", label: "GTĐH TRUNG BÌNH", align: "right", card: "hide" },
  { key: "kenh", label: "KÊNH", card: "meta" },
];

/** Query string có thể lặp khoá; lấy giá trị đầu. */
function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  await requirePermission("bao-cao.xem");

  const query = parseTableQuery(await searchParams);
  /*
   * Khoảng thời gian đọc từ URL nên chia sẻ link báo cáo là ra đúng khoảng đó,
   * và bấm Back vẫn lùi đúng chỗ — cùng lối với bảng và bộ lọc catalog.
   */
  const raw = await searchParams;
  const khoang = docKhoang({ ky: one(raw.ky), tu: one(raw.tu), den: one(raw.den) });

  const [ky, tong, top, lai] = await Promise.all([
    doanhThuTheoThang(khoang),
    tongQuanBaoCao(khoang),
    topSanPham(10),
    laiGop(khoang),
  ]);

  const tim = query.q.trim().toLowerCase();
  const loc = tim ? ky.filter((k) => `tháng ${k.thang}/${k.nam}`.includes(tim)) : ky;

  const rows: TableRow[] = loc.map((k) => ({
    id: `${k.nam}-${k.thang}`,
    csv: {
      ky: `Tháng ${k.thang}/${k.nam}`,
      doanhThu: k.doanhThu,
      soDon: k.soDon,
      gtdh: k.gtdh,
      kenh: "Website",
    },
    cells: [
      <span key="ky" className="font-semibold">
        Tháng {k.thang}/{k.nam}
      </span>,
      <span key="dt" className="font-extrabold">
        {formatVnd(k.doanhThu)}
      </span>,
      <span key="sd" className="font-mono">
        {k.soDon}
      </span>,
      <span key="gt" className="font-mono">
        {k.soDon === 0 ? "—" : formatVndPlain(k.gtdh)}
      </span>,
      <span key="kn" className="text-muted">
        Website
      </span>,
    ],
  }));

  return (
    <div>
      <KyPicker
        ky={((Object.keys(KY) as KyKey[]).includes(one(raw.ky) as KyKey) ? one(raw.ky) : "12-thang") as KyKey}
        tu={one(raw.tu) ?? ""}
        den={one(raw.den) ?? ""}
      />

      <dl className="mb-7 grid gap-px border-2 border-divider bg-divider sm:grid-cols-2 lg:grid-cols-4">
        <Card label={"Doanh thu · " + khoang.nhan} value={formatVnd(tong.doanhThu)} />
        <Card label="Số đơn tính doanh thu" value={String(tong.soDon)} />
        <Card label="Giá trị đơn trung bình" value={formatVnd(tong.gtdh)} />
        <Card
          label="Đơn đã huỷ"
          value={String(tong.soDonHuy)}
          hint="Không tính vào doanh thu"
        />
      </dl>

      {/*
        Lãi gộp dùng `unitCost` của phiếu nhập — con số vẫn nhập vào mỗi lần nhập
        hàng nhưng trước M6.16 không màn nào đọc tới, nên cửa hàng biết bán được
        bao nhiêu mà không biết lời bao nhiêu.
      */}
      <dl className="mb-7 grid gap-px border-2 border-divider bg-divider sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Doanh thu (đã tính giá vốn)" value={formatVnd(lai.doanhThu)} />
        <Card label="Giá vốn hàng bán" value={formatVnd(lai.giaVon)} hint="Bình quân gia quyền các phiếu nhập" />
        <Card label={"Lãi gộp · " + khoang.nhan} value={formatVnd(lai.laiGop)} />
        <Card label="Biên lãi gộp" value={lai.bienLai + "%"} />
      </dl>

      {lai.thieuGiaVon > 0 ? (
        <p className="mb-7 border-2 border-accent bg-accent-100 px-4 py-3 text-[13.5px] font-semibold text-accent-800">
          {lai.thieuGiaVon} dòng hàng đã bán chưa từng nhập qua hệ thống nên không có giá vốn —
          lãi gộp ở trên đang tính thiếu phần đó. Nhập hàng qua màn Nhập kho để số này về 0.
        </p>
      ) : null}

      <DataTable
        basePath="/admin/bao-cao"
        params={serializeTableQuery(query).toString()}
        title="Báo cáo"
        subtitle="Doanh thu theo thời gian, danh mục và kênh bán"
        columns={COLUMNS}
        rows={rows}
        total={loc.length}
        page={1}
        pageSize={12}
        searchPlaceholder="Tìm theo kỳ…"
        csvName="bao-cao-doanh-thu"
      />

      <section className="mt-10">
        <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
          Bán chạy nhất
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {["SKU", "SẢN PHẨM", "ĐÃ BÁN", "DOANH THU"].map((h, i) => (
                  <th
                    key={h}
                    className={
                      "label-tech whitespace-nowrap border-b-2 border-border-soft py-2 pr-3 font-bold " +
                      (i >= 2 ? "text-right" : "text-left")
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.sku}>
                  <td className="border-b border-hairline py-2 pr-3 font-mono text-[12px]">
                    {t.sku}
                  </td>
                  <td className="border-b border-hairline py-2 pr-3">{t.ten}</td>
                  <td className="border-b border-hairline py-2 pr-3 text-right font-mono">
                    {t.soLuong}
                  </td>
                  <td className="border-b border-hairline py-2 text-right font-extrabold">
                    {formatVnd(t.doanhThu)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 border border-dashed border-border-soft bg-subtle px-4 py-3 text-[12.5px] leading-[1.6] text-muted">
        Chỉ tính đơn chưa huỷ và chưa trả hàng, mốc thời gian là <strong>lúc đặt đơn</strong>. Cột
        Kênh hiện chỉ có Website — sàn thương mại điện tử mở ở M8, lúc đó mới có kênh thứ hai để
        so.
      </p>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="label-tech mb-1.5 font-bold text-faint">{label}</dt>
      <dd className="text-[22px] font-extrabold leading-none">{value}</dd>
      {hint ? <p className="mt-1.5 text-[12px] text-faint">{hint}</p> : null}
    </div>
  );
}
