/**
 * Bảng size theo nhóm hàng. Số đo tính bằng cm, đo trên sản phẩm trải phẳng
 * rồi nhân đôi vòng ngực/eo — trùng cách đo ghi trong tài liệu bàn giao.
 */

export type SizeChart = {
  title: string;
  columns: string[];
  rows: { size: string; values: string[] }[];
  fit: string;
  howTo: string[];
};

const TOPS: SizeChart = {
  title: "Bảng size áo",
  columns: ["Size", "Vòng ngực", "Rộng vai", "Dài áo", "Dài tay", "Gợi ý"],
  rows: [
    { size: "S", values: ["96", "43", "68", "19", "1m60–1m66 · 52–58kg"] },
    { size: "M", values: ["100", "45", "70", "20", "1m65–1m72 · 57–65kg"] },
    { size: "L", values: ["104", "47", "72", "21", "1m70–1m76 · 64–72kg"] },
    { size: "XL", values: ["108", "49", "74", "22", "1m74–1m80 · 71–80kg"] },
    { size: "XXL", values: ["112", "51", "76", "23", "1m78–1m85 · 79–90kg"] },
  ],
  fit: "Form vừa người. Thích mặc rộng thì lên một size.",
  howTo: [
    "Vòng ngực: đo quanh phần đầy nhất của ngực, giữ thước song song mặt đất.",
    "Rộng vai: đo từ điểm nối vai trái sang vai phải ở mặt sau.",
    "Dài áo: đo từ chân cổ sau xuống gấu áo.",
  ],
};

const LONG_PANTS: SizeChart = {
  title: "Bảng size quần dài",
  columns: ["Size", "Vòng eo", "Vòng mông", "Dài quần", "Ống", "Gợi ý"],
  rows: [
    { size: "29", values: ["74", "94", "100", "16", "50–56kg"] },
    { size: "30", values: ["76", "96", "101", "16.5", "55–62kg"] },
    { size: "31", values: ["79", "98", "102", "17", "61–68kg"] },
    { size: "32", values: ["81", "100", "103", "17.5", "67–74kg"] },
    { size: "34", values: ["86", "105", "104", "18", "73–82kg"] },
    { size: "36", values: ["91", "110", "105", "18.5", "81–90kg"] },
  ],
  fit: "Size theo inch vòng eo. Quần có spandex co giãn thêm khoảng 2cm.",
  howTo: [
    "Vòng eo: đo tại vị trí thường mặc cạp quần, không siết chặt.",
    "Vòng mông: đo quanh phần đầy nhất của mông.",
    "Dài quần: đo từ cạp xuống gấu ở mặt ngoài.",
  ],
};

const SHORTS: SizeChart = {
  title: "Bảng size quần short",
  columns: ["Size", "Vòng eo", "Vòng mông", "Dài quần", "Ống", "Gợi ý"],
  rows: [
    { size: "29", values: ["74", "94", "45", "27", "50–56kg"] },
    { size: "30", values: ["76", "96", "46", "28", "55–62kg"] },
    { size: "31", values: ["79", "98", "47", "29", "61–68kg"] },
    { size: "32", values: ["81", "100", "48", "30", "67–74kg"] },
    { size: "34", values: ["86", "105", "49", "31", "73–82kg"] },
  ],
  fit: "Gấu quần trên đầu gối khoảng 5cm với người cao 1m70.",
  howTo: [
    "Vòng eo: đo tại vị trí thường mặc cạp quần, không siết chặt.",
    "Dài quần: đo từ cạp xuống gấu ở mặt ngoài.",
  ],
};

const BY_CATEGORY: Record<string, SizeChart> = {
  "ao-phong": TOPS,
  "ao-so-mi": TOPS,
  "ao-polo": TOPS,
  "ao-hoodie": TOPS,
  "ao-khoac": TOPS,
  "quan-jeans": LONG_PANTS,
  "quan-short": SHORTS,
};

/** Phụ kiện chỉ có Freesize nên không có bảng size. */
export function sizeChartFor(categorySlug: string): SizeChart | null {
  return BY_CATEGORY[categorySlug] ?? null;
}
