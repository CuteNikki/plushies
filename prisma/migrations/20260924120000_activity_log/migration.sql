-- CreateEnum
CREATE TYPE "ActivitySubject" AS ENUM ('PLUSHIE', 'USER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'PASSWORD_CHANGED', 'LINKED', 'UNLINKED', 'SIGNED_OUT', 'PASSWORD_RESET_SENT');

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ActivityType" NOT NULL,
    "subject" "ActivitySubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_createdAt_idx" ON "activity"("createdAt");

-- CreateIndex
CREATE INDEX "activity_subject_createdAt_idx" ON "activity"("subject", "createdAt");

