import bcrypt from "bcryptjs";
import { buildSku } from "../src/lib/slug";
import {
  PrismaClient,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type Carrier,
} from "@prisma/client";

const db = new PrismaClient();

/** Mật khẩu dev cho mọi tài khoản nội bộ. Đổi trước khi lên production. */
const STAFF_PASSWORD = "admin123456";

/* Số ngẫu nhiên có hạt giống — seed chạy lại cho ra cùng dữ liệu. */
let seedState = 20260807;
function rnd() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const CATEGORIES = [
  { name: "Áo phông", slug: "ao-phong", sizes: ["S", "M", "L", "XL", "XXL"] },
  { name: "Áo sơ mi", slug: "ao-so-mi", sizes: ["S", "M", "L", "XL", "XXL"] },
  { name: "Áo polo", slug: "ao-polo", sizes: ["S", "M", "L", "XL"] },
  { name: "Áo hoodie", slug: "ao-hoodie", sizes: ["M", "L", "XL", "XXL"] },
  { name: "Áo khoác", slug: "ao-khoac", sizes: ["M", "L", "XL", "XXL"] },
  { name: "Quần jeans", slug: "quan-jeans", sizes: ["29", "30", "31", "32", "34", "36"] },
  { name: "Quần short", slug: "quan-short", sizes: ["29", "30", "31", "32", "34"] },
  { name: "Phụ kiện", slug: "phu-kien", sizes: ["Freesize"] },
];

const BRANDS = ["MSH Basic", "MSH Heritage", "Nordfelt", "Tân Bình Denim", "Kojima", "Lữ Hành"];

const COLORS = [
  { color: "Đen", hex: "#201e1d" },
  { color: "Trắng", hex: "#f7f6f5" },
  { color: "Xám bụi", hex: "#8b8785" },
  { color: "Navy", hex: "#1f2a3c" },
  { color: "Be", hex: "#c8b79b" },
  { color: "Xanh rêu", hex: "#4a5240" },
  { color: "Đỏ gạch", hex: "#ec3013" },
];

const NAME_PARTS: Record<string, string[]> = {
  "ao-phong": ["Áo phông cotton 250gsm", "Áo phông oversize", "Áo phông in đồ hoạ", "Áo phông pima", "Áo phông tay lỡ"],
  "ao-so-mi": ["Sơ mi oxford", "Sơ mi linen", "Sơ mi flannel", "Sơ mi dài tay trơn", "Sơ mi kẻ caro"],
  "ao-polo": ["Polo pique", "Polo cá sấu", "Polo viền kẻ", "Polo cotton lụa", "Polo tay ngắn"],
  "ao-hoodie": ["Hoodie nỉ bông", "Hoodie zip", "Hoodie oversize", "Hoodie in lưng", "Hoodie cổ tròn"],
  "ao-khoac": ["Khoác bomber", "Khoác denim", "Khoác gió 2 lớp", "Khoác dạ ngắn", "Khoác varsity"],
  "quan-jeans": ["Jeans slim fit", "Jeans straight", "Jeans wash nhẹ", "Jeans co giãn", "Jeans ống suông"],
  "quan-short": ["Short kaki", "Short jeans", "Short thể thao", "Short linen", "Short cargo"],
  "phu-kien": ["Thắt lưng da bò", "Mũ lưỡi trai", "Tất cotton (3 đôi)", "Ví da đứng", "Túi đeo chéo"],
};

const MATERIALS = ["Cotton 250gsm", "Cotton pha spandex 5%", "Linen 100%", "Denim 12oz", "Nỉ bông 320gsm", "Kaki chéo"];
const CARE = ["Giặt máy dưới 30°C, không sấy nóng.", "Giặt tay, phơi trong bóng râm.", "Giặt riêng lần đầu, không dùng chất tẩy."];

const PROVINCES = [
  { province: "TP. Hồ Chí Minh", district: "Quận Tân Bình", ward: "Phường 12" },
  { province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé" },
  { province: "Hà Nội", district: "Quận Cầu Giấy", ward: "Phường Dịch Vọng" },
  { province: "Đà Nẵng", district: "Quận Hải Châu", ward: "Phường Thạch Thang" },
  { province: "Cần Thơ", district: "Quận Ninh Kiều", ward: "Phường An Hoà" },
  { province: "Bình Dương", district: "TP. Thuận An", ward: "Phường Lái Thiêu" },
];

const PEOPLE = [
  "Nguyễn Minh Hiếu", "Trần Quốc Anh", "Lê Hoàng Nam", "Phạm Thanh Tùng",
  "Vũ Đức Thắng", "Đặng Gia Bảo", "Bùi Nhật Trường", "Hoàng Văn Kiên",
  "Ngô Thị Mai", "Đỗ Hải Yến", "Trịnh Công Sơn", "Lý Thành Đạt",
];

/* Ảnh Unsplash theo nhóm hàng — hiển thị đen trắng bằng CSS. */
const PHOTOS: Record<string, string[]> = {
  "ao-phong": ["photo-1521572163474-6864f9cf17ab", "photo-1503341504253-dff4815485f1", "photo-1576566588028-4147f3842f27"],
  "ao-so-mi": ["photo-1596755094514-f87e34085b2c", "photo-1602810318383-e386cc2a3ccf", "photo-1620012253295-c15cc3e65df4"],
  "ao-polo": ["photo-1586790170083-2f9ceadc732d", "photo-1571945153237-4929e783af4a", "photo-1618354691373-d851c5c3a990"],
  "ao-hoodie": ["photo-1556821840-3a63f95609a7", "photo-1620799140408-edc6dcb6d633", "photo-1509942774463-acf339cf87d5"],
  "ao-khoac": ["photo-1551028719-00167b16eac5", "photo-1591047139829-d91aecb6caea", "photo-1544022613-e87ca75a784a"],
  "quan-jeans": ["photo-1542272604-787c3835535d", "photo-1541099649105-f69ad21f3246", "photo-1475178626620-a4d074967452"],
  "quan-short": ["photo-1591195853828-11db59a44f6b", "photo-1565084888279-aca607ecce0c", "photo-1503341504253-dff4815485f1"],
  "phu-kien": ["photo-1553062407-98eeb64c6a62", "photo-1588850561407-ed78c282e89b", "photo-1620625515032-6ed0c1790c75"],
};
const photoUrl = (id: string) =>
  "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=900&q=70";

async function main() {
  console.log("Xoá dữ liệu cũ…");
  await db.$transaction([
    db.inventoryMovement.deleteMany(),
    db.goodsReceiptEvent.deleteMany(),
    db.goodsReceiptLine.deleteMany(),
    db.goodsReceipt.deleteMany(),
    db.orderEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.payment.deleteMany(),
    db.invoice.deleteMany(),
    db.order.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.review.deleteMany(),
    db.ticketMessage.deleteMany(),
    db.ticket.deleteMany(),
    db.pointEntry.deleteMany(),
    db.address.deleteMany(),
    db.variant.deleteMany(),
    db.productImage.deleteMany(),
    db.product.deleteMany(),
    db.brand.deleteMany(),
    db.category.deleteMany(),
    db.coupon.deleteMany(),
    db.supplier.deleteMany(),
    db.warehouse.deleteMany(),
    db.user.deleteMany(),
    db.counter.deleteMany(),
  ]);

  // ── Danh mục & thương hiệu ────────────────────────────────
  const categories = await Promise.all(
    CATEGORIES.map((c, i) =>
      db.category.create({ data: { name: c.name, slug: c.slug, sort: i } }),
    ),
  );
  const brands = await Promise.all(BRANDS.map((name) => db.brand.create({ data: { name } })));

  // ── Người dùng ────────────────────────────────────────────
  // Tài khoản nội bộ dùng chung một mật khẩu dev để seed xong là vào /admin
  // được ngay. Không có `passwordHash` thì Auth.js từ chối đăng nhập.
  const devPassword = await bcrypt.hash(STAFF_PASSWORD, 10);
  const staff = await db.user.create({
    data: {
      name: "Quản trị viên",
      email: "admin@menstylehouse.vn",
      role: "ADMIN",
      phone: "0900000001",
      passwordHash: devPassword,
    },
  });
  await db.user.createMany({
    data: [
      { name: "Nhân viên bán hàng", email: "staff@menstylehouse.vn", role: "STAFF", phone: "0900000002", passwordHash: devPassword },
      { name: "Thủ kho", email: "kho@menstylehouse.vn", role: "WAREHOUSE", phone: "0900000003", passwordHash: devPassword },
      { name: "Kế toán", email: "ketoan@menstylehouse.vn", role: "ACCOUNTANT", phone: "0900000004", passwordHash: devPassword },
    ],
  });

  const members = [];
  for (let i = 0; i < 12; i++) {
    const name = PEOPLE[i];
    const addr = pick(PROVINCES);
    members.push(
      await db.user.create({
        data: {
          name,
          email: slugify(name).replace(/-/g, ".") + "@gmail.com",
          phone: "09" + String(10000000 + int(0, 89999999)).slice(0, 8),
          role: "CUSTOMER",
          pointBalance: int(0, 480),
          addresses: {
            create: {
              label: "Nhà riêng",
              receiver: name,
              phone: "09" + String(10000000 + int(0, 89999999)).slice(0, 8),
              ...addr,
              street: int(1, 250) + " Đường số " + int(1, 30),
              isDefault: true,
            },
          },
        },
      }),
    );
  }

  // ── Kho & nhà cung cấp ────────────────────────────────────
  const warehouses = await Promise.all([
    db.warehouse.create({ data: { name: "Kho Tân Bình", address: "128 Trường Chinh, Q. Tân Bình, TP.HCM" } }),
    db.warehouse.create({ data: { name: "Kho Long Biên", address: "45 Ngọc Lâm, Q. Long Biên, Hà Nội" } }),
    db.warehouse.create({ data: { name: "Kho Hoà Khánh", address: "12 Âu Cơ, Q. Liên Chiểu, Đà Nẵng" } }),
  ]);
  await db.supplier.createMany({
    data: [
      { name: "Dệt may Thành Công", phone: "02838153962", taxCode: "0301446221" },
      { name: "Xưởng may An Phước", phone: "02838448485", taxCode: "0300742145" },
      { name: "Denim Tân Bình JSC", phone: "02839712345", taxCode: "0311204588" },
    ],
  });

  // ── Sản phẩm + biến thể ───────────────────────────────────
  console.log("Tạo 40 sản phẩm…");
  const allVariants: { id: string; sku: string; price: number; productName: string; color: string; size: string; imageUrl: string }[] = [];

  for (let i = 0; i < 40; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const category = categories[i % categories.length];
    const names = NAME_PARTS[cat.slug];
    const baseName = names[Math.floor(i / CATEGORIES.length) % names.length];
    const code = "MSH-" + String(101 + i);
    const name = baseName + " " + code;
    const basePrice = int(19, 89) * 10000;
    const onSale = rnd() < 0.3;

    const colors = [...COLORS].sort(() => rnd() - 0.5).slice(0, int(2, 4));
    const photos = PHOTOS[cat.slug];

    const product = await db.product.create({
      data: {
        code,
        name,
        slug: slugify(name),
        description:
          "Form chuẩn người Việt, đường may đôi ở thân và vai. Đã giặt trước nên gần như không co sau lần giặt đầu. Ảnh chụp thật tại studio, không chỉnh dáng.",
        categoryId: category.id,
        brandId: pick(brands).id,
        basePrice,
        salePrice: onSale ? Math.round((basePrice * int(70, 90)) / 100 / 1000) * 1000 : null,
        status: i < 36 ? "ACTIVE" : "DRAFT",
        material: pick(MATERIALS),
        careNote: pick(CARE),
        images: {
          create: photos.slice(0, 3).map((p, k) => ({
            url: photoUrl(p),
            alt: name + " — ảnh " + (k + 1),
            sort: k,
          })),
        },
      },
      include: { images: true },
    });

    for (const c of colors) {
      for (const size of cat.sizes) {
        const priceDelta = size === "XXL" ? 20000 : 0;
        const v = await db.variant.create({
          data: {
            productId: product.id,
            sku: buildSku(code, c.color, size),
            color: c.color,
            colorHex: c.hex,
            size,
            stock: 0, // luôn nạp qua InventoryMovement
            lowStockAt: 10,
            priceDelta,
          },
        });
        allVariants.push({
          id: v.id,
          sku: v.sku,
          price: (product.salePrice ?? product.basePrice) + priceDelta,
          productName: product.name,
          color: c.color,
          size,
          imageUrl: product.images[0]?.url ?? "",
        });
      }
    }

    // Đánh giá
    const nReviews = int(0, 6);
    for (let r = 0; r < nReviews; r++) {
      await db.review.create({
        data: {
          productId: product.id,
          authorName: pick(PEOPLE),
          rating: int(3, 5),
          body: pick([
            "Vải dày dặn, mặc mát. Giao nhanh trong 2 ngày.",
            "Form chuẩn như mô tả, mình cao 1m72 nặng 68kg mặc size L vừa.",
            "Màu ngoài đời hơi trầm hơn ảnh một chút nhưng vẫn đẹp.",
            "Đường may chắc, giặt máy 3 lần chưa xù.",
          ]),
          imageUrls: [],
          approved: rnd() < 0.85,
        },
      });
    }
    const agg = await db.review.aggregate({
      where: { productId: product.id, approved: true },
      _avg: { rating: true },
      _count: true,
    });
    await db.product.update({
      where: { id: product.id },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    });
  }

  // ── Nạp tồn kho đầu kỳ qua sổ cái (giữ bất biến) ──────────
  console.log("Nạp tồn kho đầu kỳ cho " + allVariants.length + " SKU…");
  for (const v of allVariants) {
    const qty = rnd() < 0.08 ? int(0, 6) : int(12, 90);
    if (qty === 0) continue;
    await db.$transaction([
      db.variant.update({ where: { id: v.id }, data: { stock: qty } }),
      db.inventoryMovement.create({
        data: {
          variantId: v.id,
          type: "RECEIPT",
          delta: qty,
          stockAfter: qty,
          refType: "Seed",
          note: "Tồn đầu kỳ",
          actorName: "Hệ thống",
        },
      }),
    ]);
  }

  // ── Khuyến mãi ────────────────────────────────────────────
  const now = new Date();
  const later = new Date(now.getTime() + 90 * 864e5);
  await db.coupon.createMany({
    data: [
      { code: "CHAOBAN", type: "PERCENT", value: 10, minSubtotal: 300000, maxDiscount: 100000, usageLimit: 1000, startsAt: now, endsAt: later },
      { code: "FREESHIP", type: "FREESHIP", value: 0, minSubtotal: 500000, usageLimit: 5000, startsAt: now, endsAt: later },
      { code: "MEMBER50", type: "FIXED", value: 50000, minSubtotal: 400000, memberOnly: true, perUserLimit: 2, startsAt: now, endsAt: later },
      { code: "THU2026", type: "PERCENT", value: 20, minSubtotal: 800000, maxDiscount: 300000, usageLimit: 200, startsAt: now, endsAt: later },
    ],
  });

  // ── Yêu cầu hỗ trợ ────────────────────────────────────────
  // Đủ bốn trạng thái để màn Hỗ trợ có dữ liệu ngay sau khi seed, và để các
  // tab lọc có cái mà đếm.
  const YEU_CAU = [
    { subject: "Đổi size áo hoodie từ L sang XL", status: "OPEN" as const, ten: "Trần Minh Quân", lienHe: "0903128447" },
    { subject: "Chưa nhận được hàng sau 5 ngày", status: "OPEN" as const, ten: "Lê Thị Hồng", lienHe: "hong.le@gmail.com" },
    { subject: "Xuất hoá đơn công ty cho đơn đã đặt", status: "PENDING" as const, ten: "Phạm Anh Tuấn", lienHe: "ketoan@abc.vn" },
    { subject: "Áo bị lỗi đường may ở vai", status: "PENDING" as const, ten: "Nguyễn Hải Đăng", lienHe: "0912345678" },
    { subject: "Hỏi chất liệu quần jeans MSH-106", status: "RESOLVED" as const, ten: "Võ Thành Long", lienHe: "long.vo@gmail.com" },
    { subject: "Hoàn tiền đơn đã huỷ", status: "CLOSED" as const, ten: "Đỗ Khánh Linh", lienHe: "0987654321" },
  ];

  for (let i = 0; i < YEU_CAU.length; i++) {
    const y = YEU_CAU[i];
    const gui = new Date(now.getTime() - (i + 1) * 36e5 * 9);
    await db.ticket.create({
      data: {
        code: "TIC-" + now.getFullYear() + "-" + String(i + 1).padStart(5, "0"),
        subject: y.subject,
        status: y.status,
        channel: "web",
        createdAt: gui,
        messages: {
          create: [
            {
              authorName: y.ten + " · " + y.lienHe,
              isStaff: false,
              body: y.subject + ". Nhờ cửa hàng kiểm tra và phản hồi giúp mình.",
              createdAt: gui,
            },
            ...(y.status === "RESOLVED" || y.status === "CLOSED"
              ? [
                  {
                    authorName: "Trần Thu",
                    isStaff: true,
                    body: "Chào anh/chị, cửa hàng đã kiểm tra và xử lý. Anh/chị kiểm tra lại giúp nhé.",
                    createdAt: new Date(gui.getTime() + 2 * 36e5),
                  },
                ]
              : []),
          ],
        },
      },
    });
  }
  await db.counter.upsert({
    where: { key: "TIC-" + now.getFullYear() },
    create: { key: "TIC-" + now.getFullYear(), value: YEU_CAU.length },
    update: { value: YEU_CAU.length },
  });

  // ── 30 đơn mẫu đủ trạng thái ──────────────────────────────
  console.log("Tạo 30 đơn mẫu…");
  const STATUSES: OrderStatus[] = [
    "PENDING", "CONFIRMED", "PACKING", "SHIPPING", "DELIVERED", "CANCELLED", "RETURNED",
  ];
  const METHODS: PaymentMethod[] = ["COD", "VNPAY", "MOMO", "BANK_TRANSFER"];
  const CARRIERS: Carrier[] = ["GHN", "GHTK", "VIETTEL_POST", "STORE_PICKUP"];

  for (let i = 0; i < 30; i++) {
    const status = STATUSES[i % STATUSES.length];
    const isGuest = rnd() < 0.45;
    const member = isGuest ? null : pick(members);
    const buyer = member?.name ?? pick(PEOPLE);
    const addr = pick(PROVINCES);
    const method = pick(METHODS);
    const paymentStatus: PaymentStatus =
      status === "CANCELLED" ? "UNPAID"
      : status === "RETURNED" ? "REFUNDED"
      : method === "COD" ? (status === "DELIVERED" ? "PAID" : "UNPAID")
      : "PAID";

    const lines = [];
    let subtotal = 0;
    for (let k = 0; k < int(1, 4); k++) {
      const v = pick(allVariants);
      const qty = int(1, 3);
      const lineTotal = v.price * qty;
      subtotal += lineTotal;
      lines.push({
        variantId: v.id, sku: v.sku, productName: v.productName,
        color: v.color, size: v.size, imageUrl: v.imageUrl,
        unitPrice: v.price, qty, lineTotal,
      });
    }
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const discount = rnd() < 0.25 ? Math.min(100000, Math.round(subtotal * 0.1 / 1000) * 1000) : 0;
    const total = subtotal - discount + shippingFee;
    const createdAt = new Date(now.getTime() - int(0, 60) * 864e5);

    const counter = await db.counter.upsert({
      where: { key: "MSH-" + now.getFullYear() },
      create: { key: "MSH-" + now.getFullYear(), value: 1 },
      update: { value: { increment: 1 } },
    });

    await db.order.create({
      data: {
        code: "MSH-" + now.getFullYear() + "-" + String(counter.value).padStart(5, "0"),
        userId: member?.id ?? null,
        isGuest,
        receiver: buyer,
        phone: "09" + String(10000000 + int(0, 89999999)).slice(0, 8),
        email: isGuest ? null : slugify(buyer).replace(/-/g, ".") + "@gmail.com",
        ...addr,
        street: int(1, 250) + " Đường số " + int(1, 30),
        note: rnd() < 0.2 ? "Gọi trước khi giao giúp shop." : null,
        status,
        paymentStatus,
        paymentMethod: method,
        carrier: pick(CARRIERS),
        trackingCode: status === "SHIPPING" || status === "DELIVERED" ? "GHN" + int(100000000, 999999999) : null,
        subtotal, discount, shippingFee, total,
        pointsEarned: !isGuest && status === "DELIVERED" && paymentStatus === "PAID" ? Math.floor(total / 1000) : 0,
        couponCode: discount > 0 ? "CHAOBAN" : null,
        createdAt,
        items: { create: lines },
        events: {
          create: [
            { status: "PENDING", note: "Khách đặt đơn", actorName: "Hệ thống", createdAt },
            ...(status !== "PENDING"
              ? [{ status, note: "Cập nhật trạng thái", actorName: staff.name, createdAt: new Date(createdAt.getTime() + 864e5) }]
              : []),
          ],
        },
      },
    });
  }

  const counts = {
    "danh mục": await db.category.count(),
    "sản phẩm": await db.product.count(),
    "biến thể": await db.variant.count(),
    "đơn hàng": await db.order.count(),
    "khách hàng": await db.user.count(),
  };
  console.log("Xong:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
