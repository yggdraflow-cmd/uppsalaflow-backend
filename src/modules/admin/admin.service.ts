import {
  CompanyStatus,
  PaymentStatus,
  Prisma,
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
};
