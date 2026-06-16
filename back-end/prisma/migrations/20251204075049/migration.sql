-- CreateIndex
CREATE INDEX "Image_name_idx" ON "Image"("name");

-- CreateIndex
CREATE INDEX "Image_format_idx" ON "Image"("format");

-- CreateIndex
CREATE INDEX "Image_url_idx" ON "Image"("url");

-- CreateIndex
CREATE INDEX "Image_sourceUrl_idx" ON "Image"("sourceUrl");

-- CreateIndex
CREATE INDEX "Image_sizeInBytes_idx" ON "Image"("sizeInBytes");

-- CreateIndex
CREATE INDEX "Image_width_idx" ON "Image"("width");

-- CreateIndex
CREATE INDEX "Image_height_idx" ON "Image"("height");

-- CreateIndex
CREATE INDEX "ImageAttachment_imageId_idx" ON "ImageAttachment"("imageId");

-- CreateIndex
CREATE INDEX "ImageAttachment_extensionId_idx" ON "ImageAttachment"("extensionId");

-- CreateIndex
CREATE INDEX "ImageAttachment_mimeType_idx" ON "ImageAttachment"("mimeType");

-- CreateIndex
CREATE INDEX "ImageFeature_type_idx" ON "ImageFeature"("type");

-- CreateIndex
CREATE INDEX "ImageFeature_format_idx" ON "ImageFeature"("format");

-- CreateIndex
CREATE INDEX "ImageFeature_extensionId_idx" ON "ImageFeature"("extensionId");

-- CreateIndex
CREATE INDEX "ImageFeature_name_idx" ON "ImageFeature"("name");

-- CreateIndex
CREATE INDEX "ImageFeature_imageId_idx" ON "ImageFeature"("imageId");

-- CreateIndex
CREATE INDEX "ImageTag_value_idx" ON "ImageTag"("value");

-- CreateIndex
CREATE INDEX "ImageTag_extensionId_idx" ON "ImageTag"("extensionId");

-- CreateIndex
CREATE INDEX "ImageTag_imageId_idx" ON "ImageTag"("imageId");
