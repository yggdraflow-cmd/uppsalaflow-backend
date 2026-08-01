-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "installmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "installments" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "plan" SET DEFAULT 'PRO',
ALTER COLUMN "status" SET DEFAULT 'PENDING';
