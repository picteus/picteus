/*
  Warnings:

  - You are about to drop the column `value` on the `ImageFeature` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageFeature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "name" TEXT,
    "stringValue" TEXT,
    "numericValue" REAL,
    "imageId" TEXT NOT NULL,
    CONSTRAINT "ImageFeature_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImageFeature" ("extensionId", "format", "id", "imageId", "name", "type", "stringValue") SELECT "extensionId", "format", "id", "imageId", "name", "type", "value" FROM "ImageFeature";
DROP TABLE "ImageFeature";
ALTER TABLE "new_ImageFeature" RENAME TO "ImageFeature";
CREATE INDEX "ImageFeature_type_idx" ON "ImageFeature"("type");
CREATE INDEX "ImageFeature_format_idx" ON "ImageFeature"("format");
CREATE INDEX "ImageFeature_extensionId_idx" ON "ImageFeature"("extensionId");
CREATE INDEX "ImageFeature_name_idx" ON "ImageFeature"("name");
CREATE INDEX "ImageFeature_imageId_idx" ON "ImageFeature"("imageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
