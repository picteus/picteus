-- CreateTable
CREATE TABLE "AiModel"
(
    "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extensionId"  TEXT     NOT NULL,
    "technicalId" TEXT NOT NULL COLLATE NOCASE,
    "name"         TEXT     NOT NULL,
    "comment"      TEXT,
    "creationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AiModel_extensionId_idx" ON "AiModel" ("extensionId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_extensionId_technicalId_key" ON "AiModel" ("extensionId", "technicalId");
