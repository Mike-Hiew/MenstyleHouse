import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { WelcomeDialog } from "@/components/storefront/welcome-dialog";
import "./globals.css";

/**
 * Bản variable có trục `wdth` (62–125): tiêu đề co giãn bề ngang theo mockup v2.
 * next/font không nhận `weight` cùng lúc với `axes` — bản variable đã có đủ
 * mọi độ đậm.
 */
const archivo = Archivo({
  subsets: ["latin", "vietnamese"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Men Style House — Thời trang nam",
  description: "Áo phông, sơ mi, quần jeans và phụ kiện nam. Giao toàn quốc.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={archivo.variable + " " + mono.variable}>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          {children}
          <WelcomeDialog />
        </ToastProvider>
      </body>
    </html>
  );
}
