/*
  Warnings:

  - Added the required column `internalId` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificationDate" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "internalId" BIGINT NOT NULL,
    "sizeInBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileCreationDate" DATETIME NOT NULL,
    "fileModificationDate" DATETIME NOT NULL,
    "generators" TEXT NOT NULL,
    CONSTRAINT "Image_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Image" ("creationDate", "fileCreationDate", "fileModificationDate", "format", "generators", "height", "id", "modificationDate", "name", "repositoryId", "sizeInBytes", "url", "width") SELECT "creationDate", "fileCreationDate", "fileModificationDate", "format", "generators", "height", "id", "modificationDate", "name", "repositoryId", "sizeInBytes", "url", "width" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
