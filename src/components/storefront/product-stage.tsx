"use client";

import * as React from "react";

/**
 * Màu đang chọn ở trang sản phẩm, dùng chung giữa gallery (đổi bộ ảnh theo
 * màu) và khối chọn biến thể. Hai component là anh em trong layout trang nên
 * phải nâng trạng thái lên đây thay vì để trong `VariantPicker`.
 */
type Ctx = { color: string; setColor: (c: string) => void };

const ColorCtx = React.createContext<Ctx | null>(null);

export function ProductColorProvider({
  initial,
  children,
}: {
  initial: string;
  children: React.ReactNode;
}) {
  const [color, setColor] = React.useState(initial);
  const value = React.useMemo(() => ({ color, setColor }), [color]);
  return <ColorCtx.Provider value={value}>{children}</ColorCtx.Provider>;
}

/** `null` khi nằm ngoài provider (cờ tắt) — nơi gọi tự giữ trạng thái riêng. */
export function useProductColor() {
  return React.useContext(ColorCtx);
}
