import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Mã tăng dần từ DB, không random. MSH-2026-00148, PNK-2026-0148, HD-2026-00148.
 * Phải gọi trong transaction để tránh cấp trùng.
 */
export async function nextCode(
  tx: Tx,
  prefix: "MSH" | "PNK" | "HD" | "TIC",
  pad = 5,
): Promise<string> {
  const year = new Date().getFullYear();
  const key = prefix + "-" + year;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return prefix + "-" + year + "-" + String(counter.value).padStart(pad, "0");
}
