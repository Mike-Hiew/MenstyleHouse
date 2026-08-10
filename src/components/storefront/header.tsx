import { getNavCategories } from "@/server/navigation";
import { getCartCount } from "@/server/cart";
import { currentUserId } from "@/auth";
import { getPointSummary } from "@/server/accounts";
import { hangCuaToi } from "@/server/membership";
import { currentStaff } from "@/server/admin/guard";
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

  // Menu tài khoản xổ xuống cần cả hạng và mức còn thiếu để lên hạng kế tiếp.
  const [member, hang] = userId
    ? await Promise.all([getPointSummary(userId), hangCuaToi(userId)])
    : [null, null];

  return (
    <SiteHeader
      categories={categories}
      cartCount={cartCount}
      member={
        member && hang
          ? {
              name: member.name,
              points: member.balance,
              // Tắt chương trình hạng thì menu không hiện dòng hạng nào.
              hang: hang.bat ? hang.hang : null,
              thieu: hang.bat ? hang.tiep : null,
            }
          : null
      }
      staffRole={staff ? staff.roleLabel : null}
    />
  );
}
