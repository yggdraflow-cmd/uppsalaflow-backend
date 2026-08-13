-- CreateTable
CREATE TABLE "platform_billing_plans" (
    "id" TEXT NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "installmentAmount" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_billing_plans_cycle_key" ON "platform_billing_plans"("cycle");

-- Valores iniciais dos planos da plataforma.
INSERT INTO "platform_billing_plans"
(
  "id",
  "cycle",
  "installmentAmount",
  "active",
  "createdAt",
  "updatedAt"
)
VALUES
(
  '10000000-0000-4000-8000-000000000001',
  'MONTHLY',
  100.00,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '10000000-0000-4000-8000-000000000002',
  'SEMIANNUAL',
  89.90,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  '10000000-0000-4000-8000-000000000003',
  'ANNUAL',
  83.33,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("cycle") DO NOTHING;
