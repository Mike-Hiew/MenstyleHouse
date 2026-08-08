import { getNavCategories } from "@/server/navigation";
import { getCartCount } from "@/server/cart";
import { currentUserId } from "@/auth";
import { getPointSummary } from "@/server/accounts";
import { currentStaff } from "@/server/admin/guard";
import { ROLE_LABEL } from "@/lib/roles";
import { SiteHeader } from "./site-header";

/**
 * Bọc server cho header: drawer mobile cần danh mục, huy hiệu giỏ cần số món.
 * Lấy một lần ở đây thay vì từng trang tự truy vấn.
 */
export async function Header() {
  const [categories, cartCount, userId, staff] = await Promise.all([
    getNavCategories(),
    getCartCount(),
    currentUserId(),
    currentStaff(),
  ]);

  const member = userId ? await getPointSummary(userId) : null;

  return (
    <SiteHeader
      categories={categories}
      cartCount={cartCount}
      member={member ? { name: member.name, points: member.balance } : null}
      staffRole={staff ? ROLE_LABEL[staff.role] : null}
    />
  );
}
