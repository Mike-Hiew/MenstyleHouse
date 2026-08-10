-- ─────────────────────────────────────────────────────────────────────────────
-- Số đo bảng size chuyển từ mảng chuỗi sang dữ liệu có kiểu.
--
-- Bản cũ lưu `SizeChart.columns: String[]` và `SizeChartRow.values: String[]` —
-- hai mảng song song. Hai vấn đề:
--
--   1. Không gì buộc chúng cùng độ dài. Bỏ một cột ở giữa là mọi con số của mọi
--      dòng trượt sang ô bên cạnh, bảng vẫn hiện bình thường, không ai biết.
--   2. `'88'` chỉ là một chuỗi. Máy không biết nó đo cái gì, đơn vị nào, và đo
--      cái áo hay đo người mặc — nên không thể so số đo của khách với bảng.
--
-- Sau migration này ô neo vào cột bằng khoá ngoại (`@@unique(rowId, columnId)`)
-- nên kiểu hỏng thứ nhất biến mất hẳn, còn cột mang `key`/`of`/`unit` nên con số
-- có nghĩa với máy.
--
-- Chạy được trên DB đã có dữ liệu: phần chuyển đổi đọc từ hai mảng cũ rồi mới
-- xoá chúng ở cuối.
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum
CREATE TYPE "MeasureKey" AS ENUM ('CHEST', 'WAIST', 'HIP', 'SHOULDER', 'SLEEVE', 'TOP_LENGTH', 'BOTTOM_LENGTH', 'LEG_OPENING', 'INSEAM', 'THIGH', 'NECK', 'HEIGHT', 'WEIGHT');

-- CreateEnum
CREATE TYPE "MeasureOf" AS ENUM ('GARMENT', 'BODY');

-- CreateEnum
CREATE TYPE "MeasureUnit" AS ENUM ('CM', 'INCH', 'KG');

-- CreateTable
CREATE TABLE "SizeChartColumn" (
    "id" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" "MeasureKey",
    "of" "MeasureOf" NOT NULL DEFAULT 'GARMENT',
    "unit" "MeasureUnit" NOT NULL DEFAULT 'CM',
    "sort" INTEGER NOT NULL,

    CONSTRAINT "SizeChartColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChartCell" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "min" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "text" TEXT,

    CONSTRAINT "SizeChartCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartColumn_chartId_sort_key" ON "SizeChartColumn"("chartId", "sort");

-- CreateIndex
CREATE INDEX "SizeChartCell_columnId_idx" ON "SizeChartCell"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartCell_rowId_columnId_key" ON "SizeChartCell"("rowId", "columnId");

-- AddForeignKey
ALTER TABLE "SizeChartColumn" ADD CONSTRAINT "SizeChartColumn_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "SizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChartCell" ADD CONSTRAINT "SizeChartCell_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "SizeChartRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SizeChartCell" ADD CONSTRAINT "SizeChartCell_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "SizeChartColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Chuyển dữ liệu: cột ─────────────────────────────────────────────────────
-- Id đặt theo công thức chứ không sinh ngẫu nhiên, để các bước sau tra lại được
-- và để chạy hai lần cũng ra cùng một kết quả.
INSERT INTO "SizeChartColumn" (id, "chartId", label, sort)
SELECT 'sccol_' || sc.id || '_' || (t.ord - 1), sc.id, t.col, (t.ord - 1)::int
FROM "SizeChart" sc
CROSS JOIN LATERAL unnest(sc.columns) WITH ORDINALITY AS t(col, ord);


-- ─── Chuyển dữ liệu: ô ───────────────────────────────────────────────────────
-- `'100'` thành min = max = 100; `'88-92'` thành min = 88, max = 92; thứ không
-- đọc được thành số thì giữ nguyên làm chữ, không vứt đi.
INSERT INTO "SizeChartCell" (id, "rowId", "columnId", min, max, text)
SELECT
  'sccell_' || r.id || '_' || (t.ord - 1),
  r.id,
  c.id,
  (m[1])::double precision,
  (COALESCE(m[2], m[1]))::double precision,
  CASE WHEN m IS NULL THEN t.val END
FROM "SizeChartRow" r
CROSS JOIN LATERAL unnest(r.values) WITH ORDINALITY AS t(val, ord)
JOIN "SizeChartColumn" c ON c."chartId" = r."chartId" AND c.sort = (t.ord - 1)::int
CROSS JOIN LATERAL (
  SELECT regexp_match(
    replace(replace(t.val, '–', '-'), '—', '-'),
    '^\s*([0-9]+(?:\.[0-9]+)?)\s*(?:-\s*([0-9]+(?:\.[0-9]+)?))?\s*$'
  ) AS m
) AS p;


-- ─── Gán ý nghĩa cho các cột đã biết ─────────────────────────────────────────
-- Chỉ nhận đúng những nhãn đang có. Nhãn lạ để `key = NULL`, cửa hàng tự khai
-- sau ở `/admin/bang-size` — đoán bừa còn tệ hơn để trống.
UPDATE "SizeChartColumn" SET key = 'CHEST'         WHERE label = 'Vòng ngực';
UPDATE "SizeChartColumn" SET key = 'WAIST'         WHERE label = 'Vòng eo';
UPDATE "SizeChartColumn" SET key = 'HIP'           WHERE label = 'Vòng mông';
UPDATE "SizeChartColumn" SET key = 'SHOULDER'      WHERE label = 'Rộng vai';
UPDATE "SizeChartColumn" SET key = 'SLEEVE'        WHERE label = 'Dài tay';
UPDATE "SizeChartColumn" SET key = 'TOP_LENGTH'    WHERE label = 'Dài áo';
UPDATE "SizeChartColumn" SET key = 'BOTTOM_LENGTH' WHERE label = 'Dài quần';
UPDATE "SizeChartColumn" SET key = 'LEG_OPENING'   WHERE label = 'Ống';


-- ─── Tách cột "Gợi ý" thành số đo cơ thể ─────────────────────────────────────
-- Cột này đang chứa đúng thứ mà mọi phép gợi ý size cần — chiều cao và cân nặng
-- của người mặc — nhưng nhét chung trong một chuỗi `'1m65–1m72 · 57–65kg'` nên
-- không dùng được vào việc gì ngoài đọc bằng mắt.
--
-- Chỉ làm cho ba bảng do migration trước nạp vào, vì chỉ với chúng mới biết
-- chắc từng con số nghĩa là gì. Bảng do cửa hàng tự tạo giữ nguyên cột chữ.
DELETE FROM "SizeChartColumn"
WHERE label = 'Gợi ý' AND "chartId" IN ('sc_ao', 'sc_quan_dai', 'sc_quan_short');

INSERT INTO "SizeChartColumn" (id, "chartId", label, key, "of", unit, sort)
SELECT v.id, v.chart_id, v.label, v.key::"MeasureKey", 'BODY'::"MeasureOf", v.unit::"MeasureUnit", v.sort
FROM (VALUES
  ('sccol_sc_ao_h',         'sc_ao',         'Chiều cao', 'HEIGHT', 'CM', 4),
  ('sccol_sc_ao_w',         'sc_ao',         'Cân nặng',  'WEIGHT', 'KG', 5),
  ('sccol_sc_quan_dai_w',   'sc_quan_dai',   'Cân nặng',  'WEIGHT', 'KG', 4),
  ('sccol_sc_quan_short_w', 'sc_quan_short', 'Cân nặng',  'WEIGHT', 'KG', 4)
) AS v(id, chart_id, label, key, unit, sort)
JOIN "SizeChart" sc ON sc.id = v.chart_id;

INSERT INTO "SizeChartCell" (id, "rowId", "columnId", min, max)
SELECT 'sccell_' || v.row_id || '_' || v.col_id, v.row_id, v.col_id, v.min, v.max
FROM (VALUES
  -- Áo: chiều cao (cm)
  ('scr_ao_s',   'sccol_sc_ao_h', 160.0, 166.0),
  ('scr_ao_m',   'sccol_sc_ao_h', 165.0, 172.0),
  ('scr_ao_l',   'sccol_sc_ao_h', 170.0, 176.0),
  ('scr_ao_xl',  'sccol_sc_ao_h', 174.0, 180.0),
  ('scr_ao_2xl', 'sccol_sc_ao_h', 178.0, 185.0),
  -- Áo: cân nặng (kg)
  ('scr_ao_s',   'sccol_sc_ao_w', 52.0, 58.0),
  ('scr_ao_m',   'sccol_sc_ao_w', 57.0, 65.0),
  ('scr_ao_l',   'sccol_sc_ao_w', 64.0, 72.0),
  ('scr_ao_xl',  'sccol_sc_ao_w', 71.0, 80.0),
  ('scr_ao_2xl', 'sccol_sc_ao_w', 79.0, 90.0),
  -- Quần dài: cân nặng (kg)
  ('scr_qd_29', 'sccol_sc_quan_dai_w', 50.0, 56.0),
  ('scr_qd_30', 'sccol_sc_quan_dai_w', 55.0, 62.0),
  ('scr_qd_31', 'sccol_sc_quan_dai_w', 61.0, 68.0),
  ('scr_qd_32', 'sccol_sc_quan_dai_w', 67.0, 74.0),
  ('scr_qd_34', 'sccol_sc_quan_dai_w', 73.0, 82.0),
  ('scr_qd_36', 'sccol_sc_quan_dai_w', 81.0, 90.0),
  -- Quần short: cân nặng (kg)
  ('scr_qs_29', 'sccol_sc_quan_short_w', 50.0, 56.0),
  ('scr_qs_30', 'sccol_sc_quan_short_w', 55.0, 62.0),
  ('scr_qs_31', 'sccol_sc_quan_short_w', 61.0, 68.0),
  ('scr_qs_32', 'sccol_sc_quan_short_w', 67.0, 74.0),
  ('scr_qs_34', 'sccol_sc_quan_short_w', 73.0, 82.0)
) AS v(row_id, col_id, min, max)
JOIN "SizeChartRow" r ON r.id = v.row_id
JOIN "SizeChartColumn" c ON c.id = v.col_id;


-- ─── Bỏ hai mảng cũ ──────────────────────────────────────────────────────────
-- AlterTable
ALTER TABLE "SizeChart" DROP COLUMN "columns";

-- AlterTable
ALTER TABLE "SizeChartRow" DROP COLUMN "values";
