/*
  Warnings:

  - You are about to alter the column `value` on the `ExtensionSettings` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys= ON;
PRAGMA foreign_keys= OFF;
CREATE TABLE "new_ExtensionSettings"
(
    "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extensionId"  TEXT    NOT NULL,
    "value"        JSONB,
    "captions"     JSONB,
    "eligibleTags" JSONB,
    "versions"     TEXT
);
INSERT INTO "new_ExtensionSettings" ("extensionId", "id", "value", "versions")
SELECT "extensionId", "id", "value", "versions"
FROM "ExtensionSettings";
DROP TABLE "ExtensionSettings";
ALTER TABLE "new_ExtensionSettings"
    RENAME TO "ExtensionSettings";
CREATE UNIQUE INDEX "ExtensionSettings_extensionId_key" ON "ExtensionSettings" ("extensionId");
PRAGMA foreign_keys= ON;
PRAGMA defer_foreign_keys= OFF;
