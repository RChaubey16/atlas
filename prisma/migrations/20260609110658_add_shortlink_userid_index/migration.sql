/*
  Warnings:

  - You are about to drop the `content` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "content" DROP CONSTRAINT "content_owner_id_fkey";

-- DropTable
DROP TABLE "content";

-- CreateIndex
CREATE INDEX "ShortLink_userId_idx" ON "ShortLink"("userId");
