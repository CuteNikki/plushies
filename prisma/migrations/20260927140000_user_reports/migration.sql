-- CreateEnum
CREATE TYPE "UserReportReason" AS ENUM ('NAME', 'PICTURE', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "UserReportOutcome" AS ENUM ('DISMISSED', 'RESET', 'BANNED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "nameResetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reporterId" TEXT,
    "reason" "UserReportReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "outcome" "UserReportOutcome",

    CONSTRAINT "user_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_report_userId_resolvedAt_idx" ON "user_report"("userId", "resolvedAt");

-- CreateIndex
CREATE INDEX "user_report_resolvedAt_createdAt_idx" ON "user_report"("resolvedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
