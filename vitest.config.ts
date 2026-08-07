import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /**
       * `server-only` ném lỗi ngay khi import ở môi trường Node thường; chỉ
       * dưới điều kiện `react-server` nó mới là module rỗng. Test gọi thẳng
       * `src/server/*` nên trỏ luôn vào bản rỗng mà chính gói này cung cấp.
       * Chốt chặn thật vẫn còn nguyên khi Next build.
       */
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
