import {
  CompanyStatus,
  PaymentStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type BusinessFilters = {
  status?: CompanyStatus;
  search?: string;
};

type PaymentFilters = {
  status?: PaymentStatus;
};

type BusinessActionInput = {
  businessId: string;
  actorId: string;
  ipAddress?: string;
  reason?: string;
};

type ChangeBusinessStatusInput = BusinessActionInput & {
  action: string;
  targetStatus: CompanyStatus;
  allowedStatuses: CompanyStatus[];
  clearApproval?: boolean;
  setApproval?: boolean;
  requireValidSubscription?: boolean;
};

const paymentAttentionStatuses: SubscriptionStatus[] = [
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.EXPIRED,
];

const approvalQueueStatuses: CompanyStatus[] = [
  CompanyStatus.PENDING,
  CompanyStatus.PAYMENT_PENDING,
  CompanyStatus.UNDER_REVIEW,
];

const businessListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  category: true,
  logoUrl: true,
  slug: true,
  segment: true,
  specialty: true,
  status: true,
  statusReason: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  subscription: {
    select: {
      id: true,
      plan: true,
      status: true,
      startedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  _count: {
    select: {
      clients: true,
      services: true,
      professionals: true,
      appointments: true,
      payments: true,
    },
  },
} satisfies Prisma.BusinessSelect;

const paymentListSelect = {
  id: true,
  provider: true,
  providerPaymentId: true,
  amount: true,
  status: true,
  dueAt: true,
  paidAt: true,
  failedAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  subscription: {
    select: {
      id: true,
      plan: true,
      status: true,
      startedAt: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.PaymentSelect;

function serializeBusinessStatus(data: {
  status: CompanyStatus;
  statusReason: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
}) {
  return {
    status: data.status,
    statusReason: data.statusReason,
    approvedById: data.approvedById,
    approvedAt: data.approvedAt?.toISOString() ?? null,
  };
}

async function changeBusinessStatus(input: ChangeBusinessStatusInput) {
  return prisma.$transaction(async (transaction) => {
    const business = await transaction.business.findUnique({
      where: {
        id: input.businessId,
      },
      select: {
        id: true,
        status: true,
        statusReason: true,
        approvedById: true,
        approvedAt: true,
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
          },
        },
        payments: {
          where: {
            status: PaymentStatus.PAID,
          },
          take: 1,
          orderBy: {
            paidAt: "desc",
          },
          select: {
            id: true,
            paidAt: true,
          },
        },
      },
    });

    if (!business) {
      throw new AppError("Empresa não encontrada.", 404);
    }

    if (!input.allowedStatuses.includes(business.status)) {
      throw new AppError(
        `A empresa não pode receber esta ação enquanto estiver com status ${business.status}.`,
        409
      );
    }

    if (input.requireValidSubscription) {
      if (!business.subscription) {
        throw new AppError(
          "A empresa não possui uma assinatura cadastrada.",
          409
        );
      }

      const isFreePlan =
        business.subscription.plan === SubscriptionPlan.FREE;

      if (
        !isFreePlan &&
        business.subscription.status !== SubscriptionStatus.ACTIVE
      ) {
        throw new AppError(
          "A assinatura da empresa não está ativa.",
          409
        );
      }

      if (!isFreePlan && business.payments.length === 0) {
        throw new AppError(
          "Não existe pagamento confirmado para esta empresa.",
          409
        );
      }
    }

    const previousData = serializeBusinessStatus(business);
    const approvalDate = input.setApproval ? new Date() : business.approvedAt;

    const updatedBusiness = await transaction.business.update({
      where: {
        id: input.businessId,
      },
      data: {
        status: input.targetStatus,
        statusReason:
          input.targetStatus === CompanyStatus.ACTIVE
            ? null
            : input.reason ?? null,
        approvedById: input.clearApproval
          ? null
          : input.setApproval
            ? input.actorId
            : business.approvedById,
        approvedAt: input.clearApproval ? null : approvalDate,
      },
      select: businessListSelect,
    });

    await transaction.auditLog.create({
      data: {
        actorId: input.actorId,
        businessId: input.businessId,
        action: input.action,
        entityType: "Business",
        entityId: input.businessId,
        reason: input.reason,
        previousData,
        newData: serializeBusinessStatus({
          status: updatedBusiness.status,
          statusReason: updatedBusiness.statusReason,
          approvedById: updatedBusiness.approvedBy?.id ?? null,
          approvedAt: updatedBusiness.approvedAt,
        }),
        ipAddress: input.ipAddress,
      },
    });

    return updatedBusiness;
  });
}

export const adminService = {
  async overview() {
    const [users, businesses, subscriptions, payments] = await Promise.all([
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.business.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: businessListSelect,
      }),

      prisma.subscription.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          businessId: true,
          plan: true,
          status: true,
          startedAt: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.payment.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: paymentListSelect,
      }),
    ]);

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === SubscriptionStatus.ACTIVE
    ).length;

    const paymentAttentionSubscriptions = subscriptions.filter((subscription) =>
      paymentAttentionStatuses.includes(subscription.status)
    ).length;

    const businessesWithoutSubscription = businesses.filter(
      (business) => !business.subscription
    ).length;

    const paidRevenue = payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((total, payment) => total + Number(payment.amount), 0);

    return {
      summary: {
        totalUsers: users.length,
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.ACTIVE
        ).length,
        pendingBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.PENDING
        ).length,
        paymentPendingBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.PAYMENT_PENDING
        ).length,
        underReviewBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.UNDER_REVIEW
        ).length,
        blockedBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.BLOCKED
        ).length,
        suspendedBusinesses: businesses.filter(
          (business) => business.status === CompanyStatus.SUSPENDED
        ).length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        paymentAttentionSubscriptions,
        businessesWithoutSubscription,
        totalPayments: payments.length,
        paidPayments: payments.filter(
          (payment) => payment.status === PaymentStatus.PAID
        ).length,
        pendingPayments: payments.filter(
          (payment) => payment.status === PaymentStatus.PENDING
        ).length,
        overduePayments: payments.filter(
          (payment) => payment.status === PaymentStatus.OVERDUE
        ).length,
        failedPayments: payments.filter(
          (payment) => payment.status === PaymentStatus.FAILED
        ).length,
        paidRevenue,
      },
      users,
      businesses,
      subscriptions,
      payments,
    };
  },

  async listBusinesses(filters: BusinessFilters) {
    const where: Prisma.BusinessWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    return prisma.business.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: businessListSelect,
    });
  },

  async findBusinessById(businessId: string) {
    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        ...businessListSelect,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            provider: true,
            providerPaymentId: true,
            amount: true,
            status: true,
            dueAt: true,
            paidAt: true,
            failedAt: true,
            refundedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        auditLogs: {
          take: 30,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            reason: true,
            previousData: true,
            newData: true,
            ipAddress: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!business) {
      throw new AppError("Empresa não encontrada.", 404);
    }

    return business;
  },

  async listApprovals() {
    return prisma.business.findMany({
      where: {
        status: {
          in: approvalQueueStatuses,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        ...businessListSelect,
        payments: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            provider: true,
            providerPaymentId: true,
            amount: true,
            status: true,
            dueAt: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });
  },

  async listPayments(filters: PaymentFilters) {
    return prisma.payment.findMany({
      where: filters.status
        ? {
            status: filters.status,
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
      select: paymentListSelect,
    });
  },

  async approveBusiness(input: BusinessActionInput) {
    return changeBusinessStatus({
      ...input,
      action: "BUSINESS_APPROVED",
      targetStatus: CompanyStatus.ACTIVE,
      allowedStatuses: approvalQueueStatuses,
      setApproval: true,
      requireValidSubscription: true,
    });
  },

  async rejectBusiness(input: BusinessActionInput) {
    return changeBusinessStatus({
      ...input,
      action: "BUSINESS_REJECTED",
      targetStatus: CompanyStatus.CANCELED,
      allowedStatuses: approvalQueueStatuses,
      clearApproval: true,
    });
  },

  async blockBusiness(input: BusinessActionInput) {
    return changeBusinessStatus({
      ...input,
      action: "BUSINESS_BLOCKED",
      targetStatus: CompanyStatus.BLOCKED,
      allowedStatuses: [
        CompanyStatus.PENDING,
        CompanyStatus.PAYMENT_PENDING,
        CompanyStatus.UNDER_REVIEW,
        CompanyStatus.ACTIVE,
        CompanyStatus.SUSPENDED,
      ],
    });
  },

  async suspendBusiness(input: BusinessActionInput) {
    return changeBusinessStatus({
      ...input,
      action: "BUSINESS_SUSPENDED",
      targetStatus: CompanyStatus.SUSPENDED,
      allowedStatuses: [
        CompanyStatus.ACTIVE,
        CompanyStatus.BLOCKED,
      ],
    });
  },

  async reactivateBusiness(input: BusinessActionInput) {
    return changeBusinessStatus({
      ...input,
      action: "BUSINESS_REACTIVATED",
      targetStatus: CompanyStatus.ACTIVE,
      allowedStatuses: [
        CompanyStatus.BLOCKED,
        CompanyStatus.SUSPENDED,
      ],
      setApproval: true,
      requireValidSubscription: true,
    });
  },
};
