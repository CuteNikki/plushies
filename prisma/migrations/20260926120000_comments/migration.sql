-- AlterEnum
ALTER TYPE "ActivitySubject" ADD VALUE 'COMMENT';

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "plushieId" TEXT NOT NULL,
    "authorId" TEXT,
    "parentId" TEXT,
    "replyToId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_plushieId_parentId_createdAt_idx" ON "comment"("plushieId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "comment_parentId_createdAt_idx" ON "comment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "comment_authorId_createdAt_idx" ON "comment"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_plushieId_fkey" FOREIGN KEY ("plushieId") REFERENCES "plushie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

