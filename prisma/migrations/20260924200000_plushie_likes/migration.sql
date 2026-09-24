-- CreateTable
CREATE TABLE "plushie_like" (
    "plushieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plushie_like_pkey" PRIMARY KEY ("plushieId","userId")
);

-- CreateIndex
CREATE INDEX "plushie_like_userId_idx" ON "plushie_like"("userId");

-- AddForeignKey
ALTER TABLE "plushie_like" ADD CONSTRAINT "plushie_like_plushieId_fkey" FOREIGN KEY ("plushieId") REFERENCES "plushie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plushie_like" ADD CONSTRAINT "plushie_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

