-- CreateTable
CREATE TABLE "ApiSecret" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATETIME,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "scope" TEXT,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImageAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imageId" TEXT NOT NULL,
    "extensionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "value" BLOB NOT NULL,
    CONSTRAINT "ImageAttachment_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImageAttachment" ("extensionId", "id", "imageId", "mimeType", "value") SELECT "extensionId", "id", "imageId", "mimeType", "value" FROM "ImageAttachment";
DROP TABLE "ImageAttachment";
ALTER TABLE "new_ImageAttachment" RENAME TO "ImageAttachment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ApiSecret_name_key" ON "ApiSecret"("name");
