-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "clients_userId_idx" ON "clients"("userId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
