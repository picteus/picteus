/*
  Warnings:

  - You are about to drop the column `generators` on the `Image` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "parentId" TEXT,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificationDate" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sizeInBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileCreationDate" DATETIME NOT NULL,
    "fileModificationDate" DATETIME NOT NULL,
    CONSTRAINT "Image_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Image_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Image" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Image" ("creationDate", "fileCreationDate", "fileModificationDate", "format", "height", "id", "internalId", "modificationDate", "name", "parentId", "repositoryId", "sizeInBytes", "sourceUrl", "url", "width") SELECT "creationDate", "fileCreationDate", "fileModificationDate", "format", "height", "id", "internalId", "modificationDate", "name", "parentId", "repositoryId", "sizeInBytes", "sourceUrl", "url", "width" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE INDEX "Image_name_idx" ON "Image"("name");
CREATE INDEX "Image_format_idx" ON "Image"("format");
CREATE INDEX "Image_url_idx" ON "Image"("url");
CREATE INDEX "Image_sourceUrl_idx" ON "Image"("sourceUrl");
CREATE INDEX "Image_sizeInBytes_idx" ON "Image"("sizeInBytes");
CREATE INDEX "Image_width_idx" ON "Image"("width");
CREATE INDEX "Image_height_idx" ON "Image"("height");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
