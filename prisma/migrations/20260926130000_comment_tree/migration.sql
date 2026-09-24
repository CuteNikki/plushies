-- Replies used to point at their thread's first comment (parentId) and, when
-- answering another reply, at that reply (replyToId). Now parentId is always
-- the comment a reply answers, and threadId the thread's first comment.

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_parentId_fkey";
ALTER TABLE "comment" DROP CONSTRAINT "comment_replyToId_fkey";

-- DropIndex
DROP INDEX "comment_parentId_createdAt_idx";
DROP INDEX "comment_plushieId_parentId_createdAt_idx";

-- RenameColumns
ALTER TABLE "comment" RENAME COLUMN "parentId" TO "threadId";
ALTER TABLE "comment" RENAME COLUMN "replyToId" TO "parentId";

-- Replies to a thread's first comment had no separate reply target.
UPDATE "comment" SET "parentId" = "threadId" WHERE "threadId" IS NOT NULL AND "parentId" IS NULL;

-- CreateIndex
CREATE INDEX "comment_plushieId_threadId_createdAt_idx" ON "comment"("plushieId", "threadId", "createdAt");
CREATE INDEX "comment_threadId_createdAt_idx" ON "comment"("threadId", "createdAt");
CREATE INDEX "comment_parentId_idx" ON "comment"("parentId");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
