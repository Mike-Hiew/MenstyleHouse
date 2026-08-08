-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "blobId" TEXT;

-- CreateTable
CREATE TABLE "ProductImageBlob" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/webp',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImageBlob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_blobId_key" ON "ProductImage"("blobId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_blobId_fkey" FOREIGN KEY ("blobId") REFERENCES "ProductImageBlob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

