-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageFeature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'string',
    "extensionId" TEXT,
    "value" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    CONSTRAINT "ImageFeature_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImageFeature" ("extensionId", "id", "imageId", "type", "value") SELECT "extensionId", "id", "imageId", "type", "value" FROM "ImageFeature";
DROP TABLE "ImageFeature";
ALTER TABLE "new_ImageFeature" RENAME TO "ImageFeature";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
