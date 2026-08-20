-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExtensionSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extensionId" TEXT NOT NULL,
    "value" TEXT,
    "versions" TEXT
);
INSERT INTO "new_ExtensionSettings" ("extensionId", "id", "value") SELECT "extensionId", "id", "value" FROM "ExtensionSettings";
DROP TABLE "ExtensionSettings";
ALTER TABLE "new_ExtensionSettings" RENAME TO "ExtensionSettings";
CREATE UNIQUE INDEX "ExtensionSettings_extensionId_key" ON "ExtensionSettings"("extensionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
