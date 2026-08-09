-- ─────────────────────────────────────────────────────────────────────────────
-- Chuyển ba bảng size đang viết cứng trong `src/lib/size-chart.ts` vào DB.
--
-- Không có bước này thì ngay sau khi triển khai, mọi trang sản phẩm **mất bảng
-- size** — trang vẫn chạy, không có lỗi nào, chỉ là khách không còn gì để chọn
-- size. Kiểu hỏng im lặng đúng như lỗi trả hàng ở M6.16.
--
-- `ON CONFLICT DO NOTHING` để chạy lại được trên DB đã có sẵn.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "SizeChart" (id, name, slug, fit, "howTo", "columns", "createdAt", "updatedAt")
VALUES
  ('sc_ao', 'Bảng size áo', 'ao',
   'Form vừa người. Thích mặc rộng thì lên một size.',
   ARRAY[
     'Vòng ngực: đo quanh phần đầy nhất của ngực, giữ thước song song mặt đất.',
     'Rộng vai: đo từ điểm nối vai trái sang vai phải ở mặt sau.',
     'Dài áo: đo từ chân cổ sau xuống gấu áo.'
   ],
   ARRAY['Vòng ngực', 'Rộng vai', 'Dài áo', 'Dài tay', 'Gợi ý'],
   NOW(), NOW()),

  ('sc_quan_dai', 'Bảng size quần dài', 'quan-dai',
   'Size theo inch vòng eo. Quần có spandex co giãn thêm khoảng 2cm.',
   ARRAY[
     'Vòng eo: đo tại vị trí thường mặc cạp quần, không siết chặt.',
     'Vòng mông: đo quanh phần đầy nhất của mông.',
     'Dài quần: đo từ cạp xuống gấu ở mặt ngoài.'
   ],
   ARRAY['Vòng eo', 'Vòng mông', 'Dài quần', 'Ống', 'Gợi ý'],
   NOW(), NOW()),

  ('sc_quan_short', 'Bảng size quần short', 'quan-short',
   'Gấu quần trên đầu gối khoảng 5cm với người cao 1m70.',
   ARRAY[
     'Vòng eo: đo tại vị trí thường mặc cạp quần, không siết chặt.',
     'Dài quần: đo từ cạp xuống gấu ở mặt ngoài.'
   ],
   ARRAY['Vòng eo', 'Vòng mông', 'Dài quần', 'Ống', 'Gợi ý'],
   NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "SizeChartRow" (id, "chartId", size, values, sort) VALUES
  ('scr_ao_s',  'sc_ao', 'S',   ARRAY['96','43','68','19','1m60–1m66 · 52–58kg'], 0),
  ('scr_ao_m',  'sc_ao', 'M',   ARRAY['100','45','70','20','1m65–1m72 · 57–65kg'], 1),
  ('scr_ao_l',  'sc_ao', 'L',   ARRAY['104','47','72','21','1m70–1m76 · 64–72kg'], 2),
  ('scr_ao_xl', 'sc_ao', 'XL',  ARRAY['108','49','74','22','1m74–1m80 · 71–80kg'], 3),
  ('scr_ao_2xl','sc_ao', 'XXL', ARRAY['112','51','76','23','1m78–1m85 · 79–90kg'], 4),

  ('scr_qd_29','sc_quan_dai','29', ARRAY['74','94','100','16','50–56kg'], 0),
  ('scr_qd_30','sc_quan_dai','30', ARRAY['76','96','101','16.5','55–62kg'], 1),
  ('scr_qd_31','sc_quan_dai','31', ARRAY['79','98','102','17','61–68kg'], 2),
  ('scr_qd_32','sc_quan_dai','32', ARRAY['81','100','103','17.5','67–74kg'], 3),
  ('scr_qd_34','sc_quan_dai','34', ARRAY['86','105','104','18','73–82kg'], 4),
  ('scr_qd_36','sc_quan_dai','36', ARRAY['91','110','105','18.5','81–90kg'], 5),

  ('scr_qs_29','sc_quan_short','29', ARRAY['74','94','45','27','50–56kg'], 0),
  ('scr_qs_30','sc_quan_short','30', ARRAY['76','96','46','28','55–62kg'], 1),
  ('scr_qs_31','sc_quan_short','31', ARRAY['79','98','47','29','61–68kg'], 2),
  ('scr_qs_32','sc_quan_short','32', ARRAY['81','100','48','30','67–74kg'], 3),
  ('scr_qs_34','sc_quan_short','34', ARRAY['86','105','49','31','73–82kg'], 4)
ON CONFLICT (id) DO NOTHING;

-- Gán đúng ánh xạ cũ trong `BY_CATEGORY`. Phụ kiện cố ý không có bảng nào.
UPDATE "Category" SET "sizeChartId" = 'sc_ao'
WHERE slug IN ('ao-phong', 'ao-so-mi', 'ao-polo', 'ao-hoodie', 'ao-khoac');

UPDATE "Category" SET "sizeChartId" = 'sc_quan_dai' WHERE slug = 'quan-jeans';
UPDATE "Category" SET "sizeChartId" = 'sc_quan_short' WHERE slug = 'quan-short';
