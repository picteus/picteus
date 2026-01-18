/*
  Warnings:

  - You are about to drop the column `extensionId` on the `Settings` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ExtensionSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extensionId" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL
);
INSERT INTO "new_Settings" ("id", "type", "value") SELECT "id", "type", "value" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_type_key" ON "Settings"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionSettings_extensionId_key" ON "ExtensionSettings"("extensionId");
