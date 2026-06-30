import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type AppointmentInput = {
  businessId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  notes?: string;
};

async function ensureBusinessOwner(ownerId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new AppError("Negócio não encontrado.", 404);
  }
}

export const appointmentsService = {
  async create(ownerId: string, data: AppointmentInput) {
    await ensureBusinessOwner(ownerId, data.businessId);

    const [client, professional, service] = await Promise.all([
      prisma.client.findFirst({
        where: { id: data.clientId, businessId: data.businessId },
      }),
      prisma.professional.findFirst({
        where: { id: data.professionalId, businessId: data.businessId },
      }),
      prisma.service.findFirst({
        where: { id: data.serviceId, businessId: data.businessId },
      }),
    ]);

    if (!client) {
      throw new AppError("Cliente não encontrado para este negócio.", 404);
    }

    if (!professional) {
      throw new AppError("Profissional não encontrado para este negócio.", 404);
    }

    if (!service) {
      throw new AppError("Serviço não encontrado para este negócio.", 404);
    }

    return prisma.appointment.create({
      data: {
        businessId: data.businessId,
        clientId: data.clientId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        price: data.price,
        notes: data.notes,
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
    });
  },

  async listByDay(ownerId: string, businessId: string, date: string) {
    await ensureBusinessOwner(ownerId, businessId);

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.appointment.findMany({
      where: {
        businessId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        client: true,
        professional: true,
        service: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });
  },

  async updateStatus(ownerId: string, id: string, status: AppointmentStatus) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        business: { ownerId },
      },
    });

    if (!appointment) {
      throw new AppError("Agendamento não encontrado.", 404);
    }

    return prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        professional: true,
        service: true,
      },
    });
  },
};
