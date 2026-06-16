/*
  Warnings:

  - A unique constraint covering the columns `[technicalId]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[url]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Repository" ADD COLUMN "technicalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Repository_technicalId_key" ON "Repository"("technicalId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_url_key" ON "Repository"("url");
