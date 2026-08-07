"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "info" | "error" };

const Ctx = React.createContext<(message: string, tone?: Toast["tone"]) => void>(
  () => {},
);

export function useToast() {
  return React.useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const push = React.useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-60 flex flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "border-2 px-4 py-3 text-[14px] font-semibold",
              t.tone === "error"
                ? "border-accent bg-accent text-white"
                : "border-divider bg-surface text-text",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
