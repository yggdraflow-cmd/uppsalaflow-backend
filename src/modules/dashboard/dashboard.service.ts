import { AppointmentStatus } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

async function ensureBusinessOwner(ownerId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      ownerId,
    },
  });

  if (!business) {
    throw new AppError("Negócio não encontrado.", 404);
  }
}

const activeAppointmentStatuses: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];

const validMovementStatuses: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.FINISHED,
];

function getDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date;
}

function getEndOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);

  return date;
}

function getStartOfMovementPeriod(selectedDate: Date) {
  const start = getStartOfDay(selectedDate);
  start.setDate(start.getDate() - 6);

  return start;
}

export const dashboardService = {
  async summary(ownerId: string, businessId: string, date: string) {
    await ensureBusinessOwner(ownerId, businessId);

    const selectedDate = new Date(date);

    if (Number.isNaN(selectedDate.getTime())) {
      throw new AppError("Data inválida.", 400);
    }

    const startOfDay = getStartOfDay(selectedDate);
    const endOfDay = getEndOfDay(selectedDate);
    const movementStartDate = getStartOfMovementPeriod(selectedDate);

    const [appointments, movementAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          businessId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          client: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
          professional: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
              durationMinutes: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      }),

      prisma.appointment.findMany({
        where: {
          businessId,
          date: {
            gte: movementStartDate,
            lte: endOfDay,
          },
        },
        include: {
          professional: {
            select: {
              id: true,
              name: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            date: "asc",
          },
          {
            startTime: "asc",
          },
        ],
      }),
    ]);

    const estimatedRevenue = appointments
      .filter(
        (appointment) =>
          appointment.status !== AppointmentStatus.CANCELED &&
          appointment.status !== AppointmentStatus.NO_SHOW
      )
      .reduce((total, appointment) => total + Number(appointment.price), 0);

    const realizedRevenue = appointments
      .filter(
        (appointment) => appointment.status === AppointmentStatus.FINISHED
      )
      .reduce((total, appointment) => total + Number(appointment.price), 0);

    const upcomingAppointments = appointments
      .filter((appointment) =>
        activeAppointmentStatuses.includes(appointment.status)
      )
      .slice(0, 6)
      .map((appointment) => ({
        id: appointment.id,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        price: Number(appointment.price),
        clientName: appointment.client.name,
        clientPhone: appointment.client.phone,
        clientEmail: appointment.client.email,
        professionalName: appointment.professional.name,
        serviceName: appointment.service.name,
        serviceDurationMinutes: appointment.service.durationMinutes,
      }));

    const movement = Array.from({ length: 7 }, (_, index) => {
      const currentDate = new Date(movementStartDate);
      currentDate.setDate(currentDate.getDate() + index);

      const currentDateOnly = getDateOnly(currentDate);

      const dayAppointments = movementAppointments.filter(
        (appointment) => getDateOnly(appointment.date) === currentDateOnly
      );

      const validAppointments = dayAppointments.filter((appointment) =>
        validMovementStatuses.includes(appointment.status)
      );

      const dayRealizedRevenue = dayAppointments
        .filter(
          (appointment) => appointment.status === AppointmentStatus.FINISHED
        )
        .reduce((total, appointment) => total + Number(appointment.price), 0);

      return {
        date: currentDateOnly,
        appointments: validAppointments.length,
        realizedRevenue: dayRealizedRevenue,
      };
    });

    const serviceTotals = new Map<
      string,
      {
        serviceId: string;
        serviceName: string;
        appointments: number;
        realizedRevenue: number;
      }
    >();

    const professionalTotals = new Map<
      string,
      {
        professionalId: string;
        professionalName: string;
        appointments: number;
        realizedRevenue: number;
      }
    >();

    movementAppointments
      .filter((appointment) =>
        validMovementStatuses.includes(appointment.status)
      )
      .forEach((appointment) => {
        const serviceCurrent = serviceTotals.get(appointment.service.id) || {
          serviceId: appointment.service.id,
          serviceName: appointment.service.name,
          appointments: 0,
          realizedRevenue: 0,
        };

        serviceCurrent.appointments += 1;

        if (appointment.status === AppointmentStatus.FINISHED) {
          serviceCurrent.realizedRevenue += Number(appointment.price);
        }

        serviceTotals.set(appointment.service.id, serviceCurrent);

        const professionalCurrent = professionalTotals.get(
          appointment.professional.id
        ) || {
          professionalId: appointment.professional.id,
          professionalName: appointment.professional.name,
          appointments: 0,
          realizedRevenue: 0,
        };

        professionalCurrent.appointments += 1;

        if (appointment.status === AppointmentStatus.FINISHED) {
          professionalCurrent.realizedRevenue += Number(appointment.price);
        }

        professionalTotals.set(
          appointment.professional.id,
          professionalCurrent
        );
      });

    const topServices = Array.from(serviceTotals.values())
      .sort((first, second) => second.appointments - first.appointments)
      .slice(0, 5);

    const topProfessionals = Array.from(professionalTotals.values())
      .sort((first, second) => second.appointments - first.appointments)
      .slice(0, 5);

    return {
      date,
      totalAppointments: appointments.length,
      estimatedRevenue,
      realizedRevenue,
      upcomingAppointments,
      movement,
      topServices,
      topProfessionals,
      appointmentsByStatus: {
        scheduled: appointments.filter(
          (item) => item.status === AppointmentStatus.SCHEDULED
        ).length,
        confirmed: appointments.filter(
          (item) => item.status === AppointmentStatus.CONFIRMED
        ).length,
        inProgress: appointments.filter(
          (item) => item.status === AppointmentStatus.IN_PROGRESS
        ).length,
        finished: appointments.filter(
          (item) => item.status === AppointmentStatus.FINISHED
        ).length,
        canceled: appointments.filter(
          (item) => item.status === AppointmentStatus.CANCELED
        ).length,
        noShow: appointments.filter(
          (item) => item.status === AppointmentStatus.NO_SHOW
        ).length,
      },
    };
  },
};
