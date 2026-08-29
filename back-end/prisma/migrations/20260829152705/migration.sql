/*
  Warnings:

  - You are about to drop the column `status` on the `Repository` table. All the data in the column will be lost.
  - Added the required column `state` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicalId" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "state" TEXT NOT NULL,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificationDate" DATETIME NOT NULL
);
INSERT INTO "new_Repository" ("comment", "creationDate", "id", "modificationDate", "name", "technicalId", "type", "url", "state") SELECT "comment", "creationDate", "id", "modificationDate", "name", "technicalId", "type", "url", "status" FROM "Repository";
DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";
CREATE UNIQUE INDEX "Repository_technicalId_key" ON "Repository"("technicalId");
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");
CREATE UNIQUE INDEX "Repository_name_key" ON "Repository"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
