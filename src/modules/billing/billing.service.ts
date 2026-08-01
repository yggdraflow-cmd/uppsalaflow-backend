import {
  BillingCycle,
  CompanyStatus,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

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
      business.subscription?.status === SubscriptionStatus.ACTIVE
    ) {
      throw new AppError(
        "Esta empresa já possui uma assinatura ativa.",
        409
      );
    }

    const selectedPlan = plans[cycle];

    return prisma.$transaction(async (transaction) => {
      const subscription = await transaction.subscription.upsert({
        where: {
          businessId,
        },
        create: {
          businessId,
          plan: SubscriptionPlan.PRO,
          cycle: selectedPlan.cycle,
          installments: selectedPlan.installments,
          installmentAmount: selectedPlan.installmentAmount,
          totalAmount: selectedPlan.totalAmount,
          status: SubscriptionStatus.PENDING,
        },
        update: {
          plan: SubscriptionPlan.PRO,
          cycle: selectedPlan.cycle,
          installments: selectedPlan.installments,
          installmentAmount: selectedPlan.installmentAmount,
          totalAmount: selectedPlan.totalAmount,
          status: SubscriptionStatus.PENDING,
          expiresAt: null,
        },
      });

      const pendingPayment = await transaction.payment.findFirst({
        where: {
          businessId,
          status: PaymentStatus.PENDING,
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
        metadata: {
          cycle: selectedPlan.cycle,
          installments: selectedPlan.installments,
          installmentAmount: selectedPlan.installmentAmount,
          totalAmount: selectedPlan.totalAmount,
        },
      };

      const payment = pendingPayment
        ? await transaction.payment.update({
            where: {
              id: pendingPayment.id,
            },
            data: paymentData,
          })
        : await transaction.payment.create({
            data: {
              businessId,
              ...paymentData,
            },
          });

      const updatedBusiness = await transaction.business.update({
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
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        ownerId,
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

    if (!business) {
      throw new AppError("Empresa não encontrada.", 404);
    }

    return business;
  },

  async confirmPayment(
    actorId: string,
    paymentId: string,
    ipAddress?: string
  ) {
    return prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findUnique({
        where: {
          id: paymentId,
        },
        include: {
          business: true,
          subscription: true,
        },
      });

      if (!payment) {
        throw new AppError("Pagamento não encontrado.", 404);
      }

      if (payment.status === PaymentStatus.PAID) {
        return payment;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new AppError(
          "Somente pagamentos pendentes podem ser confirmados.",
          409
        );
      }

      const confirmedPayment = await transaction.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          failedAt: null,
        },
      });

      if (payment.subscriptionId) {
        await transaction.subscription.update({
          where: {
            id: payment.subscriptionId,
          },
          data: {
            status: SubscriptionStatus.ACTIVE,
          },
        });
      }

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

      await transaction.auditLog.create({
        data: {
          actorId,
          businessId: payment.businessId,
          action: "PAYMENT_CONFIRMED",
          entityType: "Payment",
          entityId: payment.id,
          reason: "Pagamento confirmado manualmente pelo Super Admin.",
          previousData: {
            status: payment.status,
          },
          newData: {
            status: PaymentStatus.PAID,
          },
          ipAddress,
        },
      });

      return confirmedPayment;
    });
  },
};
