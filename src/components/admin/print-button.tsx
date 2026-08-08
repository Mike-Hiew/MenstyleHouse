"use client";

/** Mở hộp thoại in của trình duyệt. Chọn "Lưu thành PDF" ở đó là ra file. */
export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-11 items-center bg-accent px-6 text-[13px] font-extrabold text-bg"
    >
      {children}
    </button>
  );
}
