-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extensionId" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "state" TEXT NOT NULL,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificationDate" DATETIME NOT NULL
);
INSERT INTO "new_Repository" ("comment", "creationDate", "id", "modificationDate", "name", "state", "type", "url", "extensionId") SELECT "comment", "creationDate", "id", "modificationDate", "name", "state", "type", "url", "technicalId" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_extensionId_key" ON "Repository"("extensionId");
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Image_url_key" ON "Image"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Image_internalId_key" ON "Image"("internalId");
