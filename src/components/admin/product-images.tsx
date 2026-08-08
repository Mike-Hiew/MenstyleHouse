"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { deleteImageAction, uploadImageAction, type AdminActionState } from "@/app/admin/actions";
import { Photo } from "@/components/ui/photo";

export type ProductImageRow = {
  id: string;
  url: string;
  alt: string;
  sort: number;
  blobId: string | null;
};

/**
 * Quản lý ảnh sản phẩm. Ảnh nào có `blobId` là nằm trong DB; ảnh không có là
 * link ngoài do seed đặt (Unsplash) — hiện cả hai để thấy rõ cái nào đang tốn
 * dung lượng DB.
 */
export function ProductImages({
  slug,
  images,
}: {
  slug: string;
  images: ProductImageRow[];
}) {
  const [upState, upload, uploading] = useActionState<AdminActionState, FormData>(
    uploadImageAction,
    {},
  );
  const [delState, remove] = useActionState<AdminActionState, FormData>(deleteImageAction, {});

  const notice = upState.message ?? delState.message;
  const noticeOk = upState.message ? upState.ok : delState.ok;

  return (
    <section>
      <h2 className="mb-3 border-b-2 border-border-soft pb-2.5 text-[16px] font-extrabold">
        Ảnh sản phẩm
      </h2>

      {notice ? (
        <p
          role="alert"
          className={cn(
            "mb-4 border-2 px-3.5 py-2.5 text-[13px] font-semibold",
            noticeOk ? "border-divider bg-subtle" : "border-accent bg-accent-100 text-accent-800",
          )}
        >
          {notice}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="mb-4 border border-dashed border-border-soft bg-subtle px-4 py-6 text-[13.5px] text-muted">
          Chưa có ảnh nào. Tải lên ảnh đầu tiên bên dưới.
        </p>
      ) : (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className="border border-border-soft">
              <div className="relative aspect-[3/4] bg-subtle">
                <Photo src={img.url} alt={img.alt} sizes="(min-width: 640px) 200px, 45vw" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-hairline px-2 py-1.5">
                <span className="label-tech truncate">
                  {img.blobId ? "TRONG DB" : "LINK NGOÀI"}
                </span>
                <form action={remove}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    type="submit"
                    className="flex min-h-11 items-center text-[12px] text-faint underline"
                  >
                    Xoá
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={upload} className="border-2 border-border-soft p-4">
        <input type="hidden" name="slug" value={slug} />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">File ảnh</span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
              className="w-full border border-border-soft bg-bg px-3 py-2.5 text-[13px] file:mr-3 file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-[12px] file:font-extrabold file:text-bg"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Mô tả ảnh</span>
            <input
              name="alt"
              placeholder="Để trống thì lấy tên sản phẩm"
              className="w-full border border-border-soft bg-bg px-3 py-2.5 text-[16px] outline-none focus:border-accent lg:text-[14px]"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="min-h-12 self-end bg-accent px-5 text-[13.5px] font-extrabold text-bg disabled:opacity-60"
          >
            {uploading ? "Đang tải…" : "TẢI LÊN"}
          </button>
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.6] text-faint">
          Ảnh được nén về WebP, cạnh dài tối đa 2000px, nhắm dưới 500 KB. File gốc tối đa 8 MB.
          Ảnh trùng nội dung sẽ dùng lại bản đã có thay vì lưu thêm.
        </p>
      </form>
    </section>
  );
}
