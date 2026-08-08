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
      /**
       * `next-auth` import "next/server" không đuôi; Node ESM trong vitest
       * không tự thêm .js nên phải trỏ tay. Next tự lo chuyện này khi build.
       */
      "next/server": fileURLToPath(new URL("./node_modules/next/server.js", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    /**
     * Các file test chạy **lần lượt**, không song song.
     *
     * Cả bộ test đánh vào một Postgres duy nhất, và nhiều bài khẳng định bất
     * biến *toàn cục* `stock === Σ(movements.delta)` trên mọi SKU. Chạy song
     * song thì file này đọc đúng lúc file kia đang trừ tồn giữa chừng, và bài
     * test đỏ vì lý do không liên quan gì tới thứ nó canh. Đây là lỗi tiềm ẩn
     * từ đầu; thêm `tests/payments.test.ts` chỉ làm nó nổ đều mỗi lần chạy.
     */
    fileParallelism: false,
    server: {
      deps: {
        /**
         * Cho Vite xử lý next-auth thay vì để Node ESM tự resolve — có vậy
         * alias "next/server" ở trên mới áp được vào import bên trong gói.
         */
        inline: [/next-auth/, /@auth[/\\]core/],
      },
    },
  },
});
