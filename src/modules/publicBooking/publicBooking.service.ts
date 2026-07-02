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

type GetBookedTimesData = {
  slug: string;
  professionalId: string;
  date: string;
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

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function hasTimeConflict(
  newStartTime: string,
  newEndTime: string,
  existingStartTime: string,
  existingEndTime: string
) {
  const newStart = timeToMinutes(newStartTime);
  const newEnd = timeToMinutes(newEndTime);
  const existingStart = timeToMinutes(existingStartTime);
  const existingEnd = timeToMinutes(existingEndTime);

  return newStart < existingEnd && newEnd > existingStart;
}

async function findBusinessBySlug(slug: string) {
  return prisma.business.findFirst({
    where: {
      slug: {
        equals: slug,
        mode: "insensitive",
      },
    },
  });
}

export class PublicBookingService {
  async getBusinessBySlug(slug: string) {
    const business = await prisma.business.findFirst({
      where: {
        slug: {
          equals: slug,
          mode: "insensitive",
        },
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

  async getBookedTimes(data: GetBookedTimesData) {
    if (!data.date || !data.professionalId) {
      throw new Error("Data e profissional são obrigatórios.");
    }

    const professional = await prisma.professional.findUnique({
      where: {
        id: data.professionalId.trim(),
      },
      include: {
        business: true,
      },
    });

    if (!professional || !professional.active) {
      throw new Error("Profissional não encontrado ou inativo.");
    }
    const appointmentDate = createAppointmentDate(data.date);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: professional.businessId,
        professionalId: professional.id,
        date: appointmentDate,
        status: {
          notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
        },
      },
      orderBy: {
        startTime: "asc",
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    return {
      business: {
        id: professional.business.id,
        name: professional.business.name,
        slug: professional.business.slug,
      },
      professional: {
        id: professional.id,
        name: professional.name,
      },
      bookedTimes: appointments.map((appointment) => appointment.startTime),
      appointments,
    };
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

    const business = await findBusinessBySlug(data.slug);

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

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        professionalId: professional.id,
        date: appointmentDate,
        status: {
          notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const conflictingAppointment = existingAppointments.find((appointment) =>
      hasTimeConflict(
        data.startTime,
        endTime,
        appointment.startTime,
        appointment.endTime
      )
    );

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