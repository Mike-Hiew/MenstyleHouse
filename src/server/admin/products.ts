import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TABLE_PAGE_SIZE, type TableQuery } from "@/lib/table-params";

/** Sản phẩm phía quản trị: danh sách có tab theo trạng thái và tìm theo tên/SKU. */

export const PRODUCT_TABS = [
  { key: "", label: "Tất cả", status: null },
  { key: "dang-ban", label: "Đang bán", status: "ACTIVE" as const },
  { key: "nhap", label: "Nháp", status: "DRAFT" as const },
  { key: "luu-tru", label: "Lưu trữ", status: "ARCHIVED" as const },
];

/** Cột sắp được thẳng bằng SQL — kể cả qua quan hệ và qua số đếm biến thể. */
const SORTABLE: Record<string, (c: "asc" | "desc") => Prisma.ProductOrderByWithRelationInput> = {
  name: (c) => ({ name: c }),
  basePrice: (c) => ({ basePrice: c }),
  status: (c) => ({ status: c }),
  createdAt: (c) => ({ createdAt: c }),
  category: (c) => ({ category: { name: c } }),
  variants: (c) => ({ variants: { _count: c } }),
};

/**
 * "TỒN" là **tổng tồn của mọi biến thể**, không phải một cột trong `Product`,
 * nên Prisma không sắp được. Giống bảng khách hàng: lấy hết rồi tính rồi sắp
 * rồi mới cắt trang. Cắt trang trước rồi sắp trong 20 dòng đang hiện là bảng
 * trông đúng nhưng không đưa hàng sắp hết lên đầu — đúng thứ chủ kho cần.
 */
const TINH_TRONG_BO_NHO = "stock";

/**
 * Bảng sản phẩm. Hai bộ lọc "Danh mục" và "Thương hiệu" đúng như mockup; giá
 * trị lọc là **slug/tên** chứ không phải id, để URL còn đọc được bằng mắt và
 * chia sẻ được.
 */
export async function listAdminProducts(q: TableQuery, loc: { danhMuc?: string; thuongHieu?: string } = {}) {
  const tab = PRODUCT_TABS.find((t) => t.key === q.tab);
  const and: Prisma.ProductWhereInput[] = [];
  if (tab?.status) and.push({ status: tab.status });
  if (loc.danhMuc) and.push({ category: { slug: loc.danhMuc } });
  if (loc.thuongHieu) and.push({ brand: { name: loc.thuongHieu } });
  if (q.q) {
    and.push({
      OR: [
        { name: { contains: q.q, mode: "insensitive" } },
        { code: { contains: q.q, mode: "insensitive" } },
        { brand: { name: { contains: q.q, mode: "insensitive" } } },
        { variants: { some: { sku: { contains: q.q, mode: "insensitive" } } } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};

  const theoTon = q.sap === TINH_TRONG_BO_NHO;

  const [total, rows, counts] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      ...(theoTon
        ? {}
        : {
            orderBy: (SORTABLE[q.sap] ?? SORTABLE.createdAt)(q.chieu),
            skip: (q.trang - 1) * TABLE_PAGE_SIZE,
            take: TABLE_PAGE_SIZE,
          }),
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        basePrice: true,
        salePrice: true,
        createdAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { orderBy: { sort: "asc" }, take: 1, select: { url: true } },
        variants: { select: { stock: true } },
      },
    }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const all = counts.reduce((n, c) => n + c._count._all, 0);

  let danhSach = rows.map((p) => ({
    ...p,
    stock: p.variants.reduce((n, v) => n + v.stock, 0),
    variantCount: p.variants.length,
  }));

  if (theoTon) {
    const dau = q.chieu === "asc" ? 1 : -1;
    danhSach.sort((a, b) => dau * (a.stock - b.stock));
    danhSach = danhSach.slice((q.trang - 1) * TABLE_PAGE_SIZE, q.trang * TABLE_PAGE_SIZE);
  }

  return {
    rows: danhSach,
    total,
    tabs: PRODUCT_TABS.map((t) => ({
      key: t.key,
      label: t.label,
      count: t.status ? (byStatus.get(t.status) ?? 0) : all,
    })),
  };
}

export type AdminProductRow = Awaited<ReturnType<typeof listAdminProducts>>["rows"][number];

const editInclude = Prisma.validator<Prisma.ProductInclude>()({
  images: { orderBy: { sort: "asc" } },
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  variants: {
    orderBy: [{ color: "asc" }, { size: "asc" }],
    // Đếm để biết biến thể nào còn xoá được. Quyết định cuối vẫn ở
    // `deleteVariant`; đây chỉ là để UI khỏi mời một nút chắc chắn sẽ hỏng.
    include: { _count: { select: { movements: true, cartItems: true } } },
  },
});

export type AdminProductDetail = Prisma.ProductGetPayload<{ include: typeof editInclude }>;

export async function getProductForAdmin(slug: string): Promise<AdminProductDetail | null> {
  return db.product.findUnique({ where: { slug }, include: editInclude });
}
