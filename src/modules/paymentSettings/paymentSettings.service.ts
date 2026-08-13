import { BillingCycle } from "@prisma/client";

import { prisma } from "../../database/prisma";

type PaymentOptionInput = {
  paymentLink?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeUrl?: string | null;
  instructions?: string | null;
  active?: boolean;
};

type BillingPlanInput = {
  installmentAmount: number;
  active?: boolean;
};

const paymentOptionSelect = {
  id: true,
  cycle: true,
  paymentLink: true,
  pixCopyPaste: true,
  pixQrCodeUrl: true,
  instructions: true,
  active: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
};

const billingPlanSelect = {
  id: true,
  cycle: true,
  installmentAmount: true,
  active: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
};

const cycleOrder: Record<BillingCycle, number> = {
  MONTHLY: 1,
  SEMIANNUAL: 2,
  ANNUAL: 3,
};

const cycleInstallments: Record<BillingCycle, number> = {
  MONTHLY: 1,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

const cycleLabels: Record<BillingCycle, string> = {
  MONTHLY: "Mensal",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();

  return normalized || null;
}

function serializeBillingPlan(plan: {
  id: string;
  cycle: BillingCycle;
  installmentAmount: unknown;
  active: boolean;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const installmentAmount = Number(plan.installmentAmount);
  const installments = cycleInstallments[plan.cycle];

  return {
    id: plan.id,
    cycle: plan.cycle,
    label: cycleLabels[plan.cycle],
    installments,
    installmentAmount,
    totalAmount:
      Math.round(
        installmentAmount * installments * 100
      ) / 100,
    active: plan.active,
    updatedById: plan.updatedById,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export const paymentSettingsService = {
  async listAdminOptions() {
    const options =
      await prisma.platformPaymentOption.findMany({
        select: paymentOptionSelect,
      });

    return options.sort(
      (first, second) =>
        cycleOrder[first.cycle] - cycleOrder[second.cycle]
    );
  },

  async getActiveOption(cycle: BillingCycle) {
    return prisma.platformPaymentOption.findFirst({
      where: {
        cycle,
        active: true,
      },
      select: {
        id: true,
        cycle: true,
        paymentLink: true,
        pixCopyPaste: true,
        pixQrCodeUrl: true,
        instructions: true,
        active: true,
        updatedAt: true,
      },
    });
  },

  async saveOption(
    cycle: BillingCycle,
    actorId: string,
    data: PaymentOptionInput
  ) {
    const normalizedData = {
      paymentLink: normalizeText(data.paymentLink),
      pixCopyPaste: normalizeText(data.pixCopyPaste),
      pixQrCodeUrl: normalizeText(data.pixQrCodeUrl),
      instructions: normalizeText(data.instructions),
      active: data.active ?? true,
      updatedById: actorId,
    };

    return prisma.platformPaymentOption.upsert({
      where: {
        cycle,
      },
      create: {
        cycle,
        ...normalizedData,
      },
      update: normalizedData,
      select: paymentOptionSelect,
    });
  },

  async listAdminBillingPlans() {
    const plans =
      await prisma.platformBillingPlan.findMany({
        select: billingPlanSelect,
      });

    return plans
      .sort(
        (first, second) =>
          cycleOrder[first.cycle] -
          cycleOrder[second.cycle]
      )
      .map(serializeBillingPlan);
  },

  async saveBillingPlan(
    cycle: BillingCycle,
    actorId: string,
    data: BillingPlanInput
  ) {
    const plan =
      await prisma.platformBillingPlan.upsert({
        where: {
          cycle,
        },
        create: {
          cycle,
          installmentAmount: data.installmentAmount,
          active: data.active ?? true,
          updatedById: actorId,
        },
        update: {
          installmentAmount: data.installmentAmount,
          active: data.active ?? true,
          updatedById: actorId,
        },
        select: billingPlanSelect,
      });

    return serializeBillingPlan(plan);
  },
};
