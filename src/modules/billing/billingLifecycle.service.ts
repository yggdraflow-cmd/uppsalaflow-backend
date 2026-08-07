import {
  CompanyStatus,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";

export const PAYMENT_WARNING_DAYS = 7;
export const PAYMENT_GRACE_DAYS = 3;

export const AUTO_BILLING_SUSPENSION_REASON =
  "Pagamento vencido há mais de 3 dias. Acesso suspenso automaticamente.";

export type BillingState =
  | "FREE"
  | "NO_OPEN_PAYMENT"
  | "CURRENT"
  | "DUE_SOON"
  | "DUE_TODAY"
  | "PAST_DUE"
  | "SUSPENDED";

export type BillingSnapshot = {
  state: BillingState;
  dueAt: string | null;
  daysUntilDue: number | null;
  overdueDays: number;
  warningDays: number;
  graceDays: number;
  message: string;
};

function getSaoPauloDateOnly(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnlyToUtcTimestamp(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function differenceInCalendarDays(target: Date, current: Date) {
  const targetDate = getSaoPauloDateOnly(target);
  const currentDate = getSaoPauloDateOnly(current);

  const milliseconds =
    dateOnlyToUtcTimestamp(targetDate) -
    dateOnlyToUtcTimestamp(currentDate);

  return Math.round(milliseconds / 86_400_000);
}

export function addMonthsToDate(value: Date, months: number) {
  const result = new Date(value);
  const originalDay = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfMonth = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfMonth));

  return result;
}

function createSnapshot(
  state: BillingState,
  dueAt: Date | null,
  daysUntilDue: number | null,
  message: string
): BillingSnapshot {
  return {
    state,
    dueAt: dueAt?.toISOString() ?? null,
    daysUntilDue,
    overdueDays:
      daysUntilDue !== null && daysUntilDue < 0
        ? Math.abs(daysUntilDue)
        : 0,
    warningDays: PAYMENT_WARNING_DAYS,
    graceDays: PAYMENT_GRACE_DAYS,
    message,
  };
}

export async function synchronizeBusinessBilling(
  businessId: string,
  now = new Date()
): Promise<BillingSnapshot> {
  const business = await prisma.business.findUnique({
    where: {
      id: businessId,
    },
    select: {
      id: true,
      status: true,
      statusReason: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
        },
      },
      payments: {
        where: {
          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.OVERDUE,
            ],
          },
        },
        orderBy: [
          {
            dueAt: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        take: 1,
        select: {
          id: true,
          status: true,
          dueAt: true,
        },
      },
    },
  });

  if (!business?.subscription) {
    return createSnapshot(
      "NO_OPEN_PAYMENT",
      null,
      null,
      "Nenhuma assinatura cadastrada."
    );
  }

  if (business.subscription.plan === SubscriptionPlan.FREE) {
    return createSnapshot(
      "FREE",
      null,
      null,
      "Plano gratuito sem cobrança."
    );
  }

  const payment = business.payments[0];

  if (!payment?.dueAt) {
    return createSnapshot(
      "NO_OPEN_PAYMENT",
      null,
      null,
      "Nenhuma cobrança pendente foi encontrada."
    );
  }

  const daysUntilDue = differenceInCalendarDays(
    payment.dueAt,
    now
  );

  if (daysUntilDue > PAYMENT_WARNING_DAYS) {
    return createSnapshot(
      "CURRENT",
      payment.dueAt,
      daysUntilDue,
      "Pagamento em dia."
    );
  }

  if (daysUntilDue > 0) {
    return createSnapshot(
      "DUE_SOON",
      payment.dueAt,
      daysUntilDue,
      `O próximo pagamento vence em ${daysUntilDue} dias.`
    );
  }

  if (daysUntilDue === 0) {
    return createSnapshot(
      "DUE_TODAY",
      payment.dueAt,
      daysUntilDue,
      "O pagamento vence hoje."
    );
  }

  const overdueDays = Math.abs(daysUntilDue);

  const shouldSuspend =
    business.status === CompanyStatus.ACTIVE &&
    overdueDays > PAYMENT_GRACE_DAYS;

  const shouldMarkSubscriptionPastDue =
    overdueDays > PAYMENT_GRACE_DAYS &&
    business.subscription.status !==
      SubscriptionStatus.PAST_DUE;

  await prisma.$transaction(async (transaction) => {
    if (payment.status === PaymentStatus.PENDING) {
      await transaction.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.OVERDUE,
        },
      });
    }

    if (shouldMarkSubscriptionPastDue) {
      await transaction.subscription.update({
        where: {
          id: business.subscription!.id,
        },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      });
    }

    if (shouldSuspend) {
      await transaction.business.update({
        where: {
          id: business.id,
        },
        data: {
          status: CompanyStatus.SUSPENDED,
          statusReason: AUTO_BILLING_SUSPENSION_REASON,
        },
      });

      await transaction.auditLog.create({
        data: {
          businessId: business.id,
          action: "BUSINESS_AUTO_SUSPENDED_NONPAYMENT",
          entityType: "Business",
          entityId: business.id,
          reason: AUTO_BILLING_SUSPENSION_REASON,
          previousData: {
            status: business.status,
            statusReason: business.statusReason,
          },
          newData: {
            status: CompanyStatus.SUSPENDED,
            statusReason: AUTO_BILLING_SUSPENSION_REASON,
          },
        },
      });
    }
  });

  if (
    shouldSuspend ||
    (business.status === CompanyStatus.SUSPENDED &&
      business.statusReason ===
        AUTO_BILLING_SUSPENSION_REASON)
  ) {
    return createSnapshot(
      "SUSPENDED",
      payment.dueAt,
      daysUntilDue,
      AUTO_BILLING_SUSPENSION_REASON
    );
  }

  return createSnapshot(
    "PAST_DUE",
    payment.dueAt,
    daysUntilDue,
    `Pagamento atrasado há ${overdueDays} dias. A empresa será suspensa após ${PAYMENT_GRACE_DAYS} dias de atraso.`
  );
}

export async function synchronizeAllBusinessBillings() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
    },
  });

  return Promise.all(
    businesses.map((business) =>
      synchronizeBusinessBilling(business.id)
    )
  );
}
