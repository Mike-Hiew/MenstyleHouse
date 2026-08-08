import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // `next-env.d.ts` do Next tự sinh và luôn dùng triple-slash reference — sửa
  // tay là bị ghi đè ở lần build sau, nên bỏ qua thay vì tắt luật toàn cục.
  { ignores: [".next/**", "node_modules/**", "docs/**", "next-env.d.ts"] },
];
