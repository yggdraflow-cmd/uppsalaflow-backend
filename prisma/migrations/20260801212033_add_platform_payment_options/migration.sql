-- CreateTable
CREATE TABLE "platform_payment_options" (
    "id" TEXT NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "paymentLink" TEXT,
    "pixCopyPaste" TEXT,
    "pixQrCodeUrl" TEXT,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_payment_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_payment_options_cycle_key" ON "platform_payment_options"("cycle");
