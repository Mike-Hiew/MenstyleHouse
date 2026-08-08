-- DropIndex
DROP INDEX "ProductImage_blobId_key";

-- CreateIndex
CREATE INDEX "ProductImage_blobId_idx" ON "ProductImage"("blobId");

-- CreateIndex
CREATE INDEX "ProductImageBlob_checksum_byteSize_idx" ON "ProductImageBlob"("checksum", "byteSize");

