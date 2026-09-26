-- Plushies can be put in groups, and in an order of your own. Groups and the
-- plushies outside one share one order; plushies in a group have their own.

-- AlterTable
ALTER TABLE "plushie" ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "plushie_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plushie_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plushie_group_name_key" ON "plushie_group"("name");

-- CreateIndex
CREATE INDEX "plushie_groupId_idx" ON "plushie"("groupId");

-- AddForeignKey
ALTER TABLE "plushie" ADD CONSTRAINT "plushie_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "plushie_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Start from the order they were shown in so far: when they were added.
UPDATE "plushie"
SET "position" = ordered."number"
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS "number"
    FROM "plushie"
) AS ordered
WHERE "plushie"."id" = ordered."id";
