import { BillingCycle } from "@prisma/client";

import { prisma } from "../../database/prisma";

type PaymentOptionInput = {
  paymentLink?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeUrl?: string | null;
  instructions?: string | null;
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

const cycleOrder: Record<BillingCycle, number> = {
  MONTHLY: 1,
  SEMIANNUAL: 2,
  ANNUAL: 3,
};

function normalizeText(value?: string | null) {
  const normalized = value?.trim();

  return normalized || null;
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
};
