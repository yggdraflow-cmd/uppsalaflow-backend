import {
  BillingCycle,
  CompanyStatus,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  addMonthsToDate,
  AUTO_BILLING_SUSPENSION_REASON,
  synchronizeBusinessBilling,
} from "./billingLifecycle.service";

const plans = {
  [BillingCycle.MONTHLY]: {
    cycle: BillingCycle.MONTHLY,
    label: "Mensal",
    installments: 1,
    installmentAmount: 100,
    totalAmount: 100,
    description: "1x de R$ 100,00",
  },
  [BillingCycle.SEMIANNUAL]: {
    cycle: BillingCycle.SEMIANNUAL,
    label: "Semestral",
    installments: 6,
    installmentAmount: 89.9,
    totalAmount: 539.4,
    description: "6x de R$ 89,90",
  },
  [BillingCycle.ANNUAL]: {
    cycle: BillingCycle.ANNUAL,
    label: "Anual",
    installments: 12,
    installmentAmount: 83.33,
    totalAmount: 999.96,
    description: "12x de R$ 83,33",
  },
};

function getPaymentMetadata(metadata: unknown) {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

function getPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
}

export const billingService = {
  listPlans() {
    return Object.values(plans);
  },

  async selectPlan(
    ownerId: string,
    businessId: string,
    cycle: BillingCycle
  ) {
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId,
      },
      include: {
        subscription: true,
      },
    });

    if (!business) {
      throw new AppError("Empresa não encontrada.", 404);
    }

    if (
      business.status === CompanyStatus.ACTIVE &&
      business.subscription?.status ===
        SubscriptionStatus.ACTIVE
    ) {
      throw new AppError(
        "Esta empresa já possui uma assinatura ativa.",
        409
      );
    }

    const selectedPlan = plans[cycle];

    return prisma.$transaction(async (transaction) => {
      const subscription =
        await transaction.subscription.upsert({
          where: {
            businessId,
          },
          create: {
            businessId,
            plan: SubscriptionPlan.PRO,
            cycle: selectedPlan.cycle,
            installments: selectedPlan.installments,
            installmentAmount:
              selectedPlan.installmentAmount,
            totalAmount: selectedPlan.totalAmount,
            status: SubscriptionStatus.PENDING,
          },
          update: {
            plan: SubscriptionPlan.PRO,
            cycle: selectedPlan.cycle,
            installments: selectedPlan.installments,
            installmentAmount:
              selectedPlan.installmentAmount,
            totalAmount: selectedPlan.totalAmount,
            status: SubscriptionStatus.PENDING,
            expiresAt: null,
          },
        });

      const openPayment =
        await transaction.payment.findFirst({
          where: {
            businessId,
            status: {
              in: [
                PaymentStatus.PENDING,
                PaymentStatus.OVERDUE,
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const paymentData = {
        subscriptionId: subscription.id,
        provider: "MANUAL",
        amount: selectedPlan.installmentAmount,
        status: PaymentStatus.PENDING,
        dueAt: new Date(),
        paidAt: null,
        failedAt: null,
        metadata: {
          cycle: selectedPlan.cycle,
          installments: selectedPlan.installments,
          installmentNumber: 1,
          renewalCycle: 1,
          installmentAmount:
            selectedPlan.installmentAmount,
          totalAmount: selectedPlan.totalAmount,
        },
      };

      const payment = openPayment
        ? await transaction.payment.update({
            where: {
              id: openPayment.id,
            },
            data: paymentData,
          })
        : await transaction.payment.create({
            data: {
              businessId,
              ...paymentData,
            },
          });

      const updatedBusiness =
        await transaction.business.update({
          where: {
            id: businessId,
          },
          data: {
            status: CompanyStatus.PAYMENT_PENDING,
            statusReason:
              "Plano escolhido. Aguardando confirmação do pagamento.",
            approvedAt: null,
            approvedById: null,
          },
          include: {
            subscription: true,
            payments: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        });

      return {
        business: updatedBusiness,
        subscription,
        payment,
        plan: selectedPlan,
      };
    });
  },

  async getStatus(ownerId: string, businessId: string) {
    const ownedBusiness =
      await prisma.business.findFirst({
        where: {
          id: businessId,
          ownerId,
        },
        select: {
          id: true,
        },
      });

    if (!ownedBusiness) {
      throw new AppError("Empresa não encontrada.", 404);
    }

    const billing =
      await synchronizeBusinessBilling(businessId);

    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      include: {
        subscription: true,
        payments: {
          orderBy: [
            {
              dueAt: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
        },
      },
    });

    return {
      ...business,
      billing,
    };
  },

  async confirmPayment(
    actorId: string,
    paymentId: string,
    ipAddress?: string
  ) {
    return prisma.$transaction(async (transaction) => {
      const payment =
        await transaction.payment.findUnique({
          where: {
            id: paymentId,
          },
          include: {
            business: true,
            subscription: true,
          },
        });

      if (!payment) {
        throw new AppError(
          "Pagamento não encontrado.",
          404
        );
      }

      if (payment.status === PaymentStatus.PAID) {
        return payment;
      }

      if (
        payment.status !== PaymentStatus.PENDING &&
        payment.status !== PaymentStatus.OVERDUE
      ) {
        throw new AppError(
          "Somente pagamentos pendentes ou atrasados podem ser confirmados.",
          409
        );
      }

      if (!payment.subscription) {
        throw new AppError(
          "A cobrança não possui uma assinatura vinculada.",
          409
        );
      }

      const now = new Date();
      const nextDueAt = addMonthsToDate(now, 1);
      const metadata = getPaymentMetadata(
        payment.metadata
      );

      const totalInstallments = Math.max(
        1,
        payment.subscription.installments
      );

      const currentInstallment = getPositiveNumber(
        metadata.installmentNumber,
        1
      );

      const currentRenewalCycle = getPositiveNumber(
        metadata.renewalCycle,
        1
      );

      const completedCycle =
        currentInstallment >= totalInstallments;

      const nextInstallment = completedCycle
        ? 1
        : currentInstallment + 1;

      const nextRenewalCycle = completedCycle
        ? currentRenewalCycle + 1
        : currentRenewalCycle;

      const confirmedPayment =
        await transaction.payment.update({
          where: {
            id: paymentId,
          },
          data: {
            status: PaymentStatus.PAID,
            paidAt: now,
            failedAt: null,
          },
        });

      await transaction.subscription.update({
        where: {
          id: payment.subscription.id,
        },
        data: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: nextDueAt,
        },
      });

      const existingOpenPayment =
        await transaction.payment.findFirst({
          where: {
            subscriptionId: payment.subscription.id,
            id: {
              not: payment.id,
            },
            status: {
              in: [
                PaymentStatus.PENDING,
                PaymentStatus.OVERDUE,
              ],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      const nextPaymentData = {
        businessId: payment.businessId,
        subscriptionId: payment.subscription.id,
        provider: "MANUAL",
        amount:
          payment.subscription.installmentAmount,
        status: PaymentStatus.PENDING,
        dueAt: nextDueAt,
        paidAt: null,
        failedAt: null,
        metadata: {
          cycle: payment.subscription.cycle,
          installments: totalInstallments,
          installmentNumber: nextInstallment,
          renewalCycle: nextRenewalCycle,
          installmentAmount: Number(
            payment.subscription.installmentAmount
          ),
          totalAmount: Number(
            payment.subscription.totalAmount
          ),
        },
      };

      if (existingOpenPayment) {
        await transaction.payment.update({
          where: {
            id: existingOpenPayment.id,
          },
          data: nextPaymentData,
        });
      } else {
        await transaction.payment.create({
          data: nextPaymentData,
        });
      }

      const isFirstApproval =
        !payment.business.approvedAt;

      const isAutomaticBillingSuspension =
        payment.business.status ===
          CompanyStatus.SUSPENDED &&
        payment.business.statusReason ===
          AUTO_BILLING_SUSPENSION_REASON;

      if (isFirstApproval) {
        await transaction.business.update({
          where: {
            id: payment.businessId,
          },
          data: {
            status: CompanyStatus.UNDER_REVIEW,
            statusReason:
              "Pagamento confirmado. Aguardando aprovação do Super Admin.",
          },
        });
      } else if (isAutomaticBillingSuspension) {
        await transaction.business.update({
          where: {
            id: payment.businessId,
          },
          data: {
            status: CompanyStatus.ACTIVE,
            statusReason: null,
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorId,
          businessId: payment.businessId,
          action: "PAYMENT_CONFIRMED",
          entityType: "Payment",
          entityId: payment.id,
          reason:
            "Pagamento confirmado manualmente pelo Super Admin.",
          previousData: {
            status: payment.status,
          },
          newData: {
            status: PaymentStatus.PAID,
            nextDueAt: nextDueAt.toISOString(),
          },
          ipAddress,
        },
      });

      return confirmedPayment;
    });
  },
};
