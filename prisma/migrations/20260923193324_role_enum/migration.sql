-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'USER');

-- Convert the existing text column in place ('admin' becomes 'ADMIN' and so
-- on) instead of dropping and recreating it, which would lose every role.
-- An unexpected value makes the cast fail and the migration roll back.
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role" USING UPPER("role")::"Role";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';
