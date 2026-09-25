-- A comment can be reported again by the same person once their earlier
-- report is closed; the app keeps it to one open report each.

-- DropIndex
DROP INDEX "comment_report_reportedCommentId_reporterId_key";

-- CreateIndex
CREATE INDEX "comment_report_reportedCommentId_reporterId_idx" ON "comment_report"("reportedCommentId", "reporterId");
