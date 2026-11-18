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
    "mode" TEXT NOT NULL DEFAULT 'enabled',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "state" TEXT NOT NULL,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificationDate" DATETIME NOT NULL
);
INSERT INTO "new_Repository" ("comment", "creationDate", "extensionId", "id", "modificationDate", "name", "available", "state", "type", "url") SELECT "comment", "creationDate", "extensionId", "id", "modificationDate", "name", CASE WHEN "state" IN ('UNAVAILABLE', 'UNAVAILABLE_INDEXING') THEN false ELSE true END, CASE WHEN "state" IN ('INDEXING', 'UNAVAILABLE_INDEXING') THEN 'indexing' WHEN "state" IN ('READY', 'UNAVAILABLE') THEN 'ready' ELSE LOWER("state") END, "type", "url" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_extensionId_key" ON "Repository"("extensionId");
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
