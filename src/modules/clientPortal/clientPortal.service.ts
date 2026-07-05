import { prisma } from "../../database/prisma";

export const clientPortalService = {
  async listAppointments(userId: string) {
    const appointments = await prisma.appointment.findMany({
      where: {
        client: {
          userId,
        },
      },
      orderBy: [
        {
          date: "desc",
        },
        {
          startTime: "desc",
        },
      ],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        price: true,
        notes: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        date: appointment.date.toISOString().slice(0, 10),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        price: appointment.price.toString(),
        notes: appointment.notes,
        createdAt: appointment.createdAt,
        business: appointment.business,
        service: appointment.service,
        professional: appointment.professional,
      })),
    };
  },
};
