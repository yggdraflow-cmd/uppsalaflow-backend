import { AppointmentStatus } from "@prisma/client";

import { prisma } from "../../database/prisma";

type CreatePublicAppointmentData = {
  slug: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  professionalId: string;
  date: string;
  startTime: string;
  notes?: string;
};

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date(2000, 0, 1, hours, minutes);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  const finalHours = String(date.getHours()).padStart(2, "0");
  const finalMinutes = String(date.getMinutes()).padStart(2, "0");

  return `${finalHours}:${finalMinutes}`;
}

function createAppointmentDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

export class PublicBookingService {
  async getBusinessBySlug(slug: string) {
    const business = await prisma.business.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        category: true,
        slug: true,
        services: {
          where: {
            active: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMinutes: true,
            category: true,
            active: true,
          },
        },
        professionals: {
          where: {
            active: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            active: true,
          },
        },
      },
    });

    return business;
  }

  async createAppointment(data: CreatePublicAppointmentData) {
    if (!data.clientName || !data.clientPhone) {
      throw new Error("Nome e telefone do cliente são obrigatórios.");
    }

    if (!data.serviceId || !data.professionalId) {
      throw new Error("Serviço e profissional são obrigatórios.");
    }

    if (!data.date || !data.startTime) {
      throw new Error("Data e horário são obrigatórios.");
    }

    const business = await prisma.business.findUnique({
      where: {
        slug: data.slug,
      },
    });

    if (!business) {
      throw new Error("Negócio não encontrado.");
    }

    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        businessId: business.id,
        active: true,
      },
    });

    if (!service) {
      throw new Error("Serviço não encontrado ou inativo.");
    }

    const professional = await prisma.professional.findFirst({
      where: {
        id: data.professionalId,
        businessId: business.id,
        active: true,
      },
    });

    if (!professional) {
      throw new Error("Profissional não encontrado ou inativo.");
    }

    const appointmentDate = createAppointmentDate(data.date);
    const endTime = addMinutesToTime(data.startTime, service.durationMinutes);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        businessId: business.id,
        professionalId: professional.id,
        date: appointmentDate,
        startTime: data.startTime,
        status: {
          notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
        },
      },
    });

    if (conflictingAppointment) {
      throw new Error("Esse horário já está ocupado para este profissional.");
    }

    const clientSearchConditions = [];

    if (data.clientPhone) {
      clientSearchConditions.push({
        phone: data.clientPhone,
      });
    }

    if (data.clientEmail) {
      clientSearchConditions.push({
        email: data.clientEmail,
      });
    }

    let client = await prisma.client.findFirst({
      where: {
        businessId: business.id,
        OR: clientSearchConditions,
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          businessId: business.id,
          name: data.clientName,
          phone: data.clientPhone,
          email: data.clientEmail || null,
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        professionalId: professional.id,
        serviceId: service.id,
        date: appointmentDate,
        startTime: data.startTime,
        endTime,
        status: AppointmentStatus.SCHEDULED,
        price: service.price,
        notes: data.notes || null,
      },
      include: {
        client: true,
        service: true,
        professional: true,
        business: true,
      },
    });

    return appointment;
  }
}