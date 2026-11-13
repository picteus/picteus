-- AlterTable
ALTER TABLE "ExtensionSettings" ADD COLUMN "embeddings" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extensionId" TEXT NOT NULL,
    "technicalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "modalities" JSONB NOT NULL DEFAULT [],
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AiModel" ("comment", "creationDate", "extensionId", "id", "name", "technicalId") SELECT "comment", "creationDate", "extensionId", "id", "name", "technicalId" FROM "AiModel";
DROP TABLE "AiModel";
ALTER TABLE "new_AiModel" RENAME TO "AiModel";
CREATE INDEX "AiModel_extensionId_idx" ON "AiModel"("extensionId");
CREATE UNIQUE INDEX "AiModel_extensionId_technicalId_key" ON "AiModel"("extensionId", "technicalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
