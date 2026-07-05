import { SubscriptionStatus } from "@prisma/client";

import { prisma } from "../../database/prisma";

export const adminService = {
  async overview() {
    const [users, businesses, subscriptions] = await Promise.all([
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.business.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          category: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
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
            },
          },
        },
      }),

      prisma.subscription.findMany({
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
    ]);

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === SubscriptionStatus.ACTIVE
    ).length;

    const paymentAttentionSubscriptions = subscriptions.filter((subscription) =>
      [
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELED,
        SubscriptionStatus.EXPIRED,
      ].includes(subscription.status)
    ).length;

    const businessesWithoutSubscription = businesses.filter(
      (business) => !business.subscription
    ).length;

    return {
      summary: {
        totalUsers: users.length,
        totalBusinesses: businesses.length,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        paymentAttentionSubscriptions,
        businessesWithoutSubscription,
      },
      users,
      businesses,
      subscriptions,
    };
  },
};
