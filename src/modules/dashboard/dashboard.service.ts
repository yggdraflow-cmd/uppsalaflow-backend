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
    });

    const estimatedRevenue = appointments
      .filter((appointment) => appointment.status !== AppointmentStatus.CANCELED)
      .filter((appointment) => appointment.status !== AppointmentStatus.NO_SHOW)
      .reduce((total, appointment) => total + Number(appointment.price), 0);

    return {
      date,
      totalAppointments: appointments.length,
      estimatedRevenue,
      appointmentsByStatus: {
        scheduled: appointments.filter((item) => item.status === "SCHEDULED").length,
        confirmed: appointments.filter((item) => item.status === "CONFIRMED").length,
        inProgress: appointments.filter((item) => item.status === "IN_PROGRESS").length,
        finished: appointments.filter((item) => item.status === "FINISHED").length,
        canceled: appointments.filter((item) => item.status === "CANCELED").length,
        noShow: appointments.filter((item) => item.status === "NO_SHOW").length,
      },
    };
  },
};
