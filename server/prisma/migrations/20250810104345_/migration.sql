/*
  Warnings:

  - Made the column `extensionId` on table `ImageFeature` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "ImageAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imageId" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "value" BLOB NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageFeature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'string',
    "extensionId" TEXT NOT NULL,
    "name" TEXT,
    "value" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    CONSTRAINT "ImageFeature_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImageFeature" ("extensionId", "format", "id", "imageId", "type", "value") SELECT "extensionId", "format", "id", "imageId", "type", "value" FROM "ImageFeature";
DROP TABLE "ImageFeature";
ALTER TABLE "new_ImageFeature" RENAME TO "ImageFeature";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
