import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

async function ensureBusinessOwner(ownerId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
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

export const dashboardService = {
  async summary(ownerId: string, businessId: string, date: string) {
    await ensureBusinessOwner(ownerId, businessId);

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
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
    });

    const estimatedRevenue = appointments
      .filter((appointment) => appointment.status !== AppointmentStatus.CANCELED)
      .filter((appointment) => appointment.status !== AppointmentStatus.NO_SHOW)
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

    return {
      date,
      totalAppointments: appointments.length,
      estimatedRevenue,
      upcomingAppointments,
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
