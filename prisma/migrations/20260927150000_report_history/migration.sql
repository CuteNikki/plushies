-- Reports stay for the history once what they're about is gone, with a
-- copy of it as it was reported.

-- AlterEnum
ALTER TYPE "UserReportOutcome" ADD VALUE 'DELETED';

-- DropForeignKey
ALTER TABLE "comment_report" DROP CONSTRAINT "comment_report_commentId_fkey";

-- DropForeignKey
ALTER TABLE "user_report" DROP CONSTRAINT "user_report_userId_fkey";

-- DropIndex
DROP INDEX "comment_report_commentId_reporterId_key";

-- AlterTable: new columns start nullable, get filled in from what the
-- reports point at, then become required.
ALTER TABLE "comment_report" ADD COLUMN     "commentAuthorId" TEXT,
ADD COLUMN     "commentAuthorName" TEXT,
ADD COLUMN     "commentBody" TEXT,
ADD COLUMN     "plushieName" TEXT,
ADD COLUMN     "plushieSlug" TEXT,
ADD COLUMN     "reportedCommentId" TEXT,
ALTER COLUMN "commentId" DROP NOT NULL;

UPDATE "comment_report" AS r
SET "reportedCommentId" = c."id",
    "commentBody" = c."body",
    "commentAuthorId" = c."authorId",
    "commentAuthorName" = u."name",
    "plushieName" = p."name",
    "plushieSlug" = p."slug"
FROM "comment" AS c
JOIN "plushie" AS p ON p."id" = c."plushieId"
LEFT JOIN "user" AS u ON u."id" = c."authorId"
WHERE c."id" = r."commentId";

ALTER TABLE "comment_report" ALTER COLUMN "commentBody" SET NOT NULL,
ALTER COLUMN "plushieName" SET NOT NULL,
ALTER COLUMN "plushieSlug" SET NOT NULL,
ALTER COLUMN "reportedCommentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_report" ADD COLUMN     "reportedUserId" TEXT,
ADD COLUMN     "userName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "user_report" AS r
SET "reportedUserId" = u."id",
    "userName" = u."name"
FROM "user" AS u
WHERE u."id" = r."userId";

ALTER TABLE "user_report" ALTER COLUMN "reportedUserId" SET NOT NULL,
ALTER COLUMN "userName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "comment_report_commentAuthorId_idx" ON "comment_report"("commentAuthorId");

-- CreateIndex
CREATE INDEX "comment_report_reporterId_idx" ON "comment_report"("reporterId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_report_reportedCommentId_reporterId_key" ON "comment_report"("reportedCommentId", "reporterId");

-- CreateIndex
CREATE INDEX "user_report_reportedUserId_idx" ON "user_report"("reportedUserId");

-- CreateIndex
CREATE INDEX "user_report_reporterId_idx" ON "user_report"("reporterId");

-- AddForeignKey
ALTER TABLE "comment_report" ADD CONSTRAINT "comment_report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
