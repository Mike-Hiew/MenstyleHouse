import { cn } from "@/lib/cn";

type Tone = "accent" | "neutral" | "outline" | "ok" | "warn";

const tones: Record<Tone, string> = {
  accent: "bg-accent-100 text-accent-800",
  neutral: "bg-neutral-200 text-neutral-800",
  outline: "border-2 border-divider text-text",
  ok: "bg-neutral-900 text-white",
  warn: "bg-accent text-white",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
