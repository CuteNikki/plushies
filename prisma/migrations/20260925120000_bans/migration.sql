-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'BANNED';
ALTER TYPE "ActivityType" ADD VALUE 'UNBANNED';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedById" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
