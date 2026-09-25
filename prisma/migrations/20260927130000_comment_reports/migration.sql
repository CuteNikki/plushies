-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportOutcome" AS ENUM ('KEPT', 'DELETED');

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "comment_report" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "outcome" "ReportOutcome",

    CONSTRAINT "comment_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_report_resolvedAt_createdAt_idx" ON "comment_report"("resolvedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "comment_report_commentId_reporterId_key" ON "comment_report"("commentId", "reporterId");

-- AddForeignKey
ALTER TABLE "comment_report" ADD CONSTRAINT "comment_report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_report" ADD CONSTRAINT "comment_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_report" ADD CONSTRAINT "comment_report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
