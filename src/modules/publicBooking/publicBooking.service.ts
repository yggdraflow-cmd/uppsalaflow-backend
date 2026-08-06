import { AppointmentStatus, UserRole } from "@prisma/client";

import { prisma } from "../../database/prisma";
import {
  getSaoPauloDateTime,
  isAppointmentStartInPast,
} from "../../utils/appointmentTime";

type CreatePublicAppointmentData = {
  slug: string;
  clientUserId?: string;
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

const BUSINESS_OPEN_TIME = "08:00";
const BUSINESS_CLOSE_TIME = "18:00";

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date(2000, 0, 1, hours, minutes);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  const finalHours = String(date.getHours()).padStart(2, "0");
  const finalMinutes = String(date.getMinutes()).padStart(2, "0");

  return `${finalHours}:${finalMinutes}`;
}

function createAppointmentDate(date: string) {
  return new Date(`${date.split("T")[0]}T00:00:00`);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function isValidTimeBlock(time: string) {
  const timeRegex = /^([01]\d|2[0-3]):(00|30)$/;

  return timeRegex.test(time);
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

function isInsideBusinessHours(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const open = timeToMinutes(BUSINESS_OPEN_TIME);
  const close = timeToMinutes(BUSINESS_CLOSE_TIME);

  return start >= open && end <= close;
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

    const business = await findBusinessBySlug(data.slug);

    if (!business) {
      throw new Error("Negócio não encontrado.");
    }

    const professional = await prisma.professional.findFirst({
      where: {
        id: data.professionalId.trim(),
        businessId: business.id,
        active: true,
      },
      include: {
        business: true,
      },
    });

    if (!professional) {
      throw new Error("Profissional não encontrado ou inativo.");
    }

    const appointmentDate = createAppointmentDate(data.date);

    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
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

    const current = getSaoPauloDateTime();

    return {
      currentDate: current.date,
      currentTime: current.time,
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
    if (!data.clientUserId) {
      throw new Error("Para agendar, entre ou crie sua conta de cliente.");
    }

    const clientUser = await prisma.user.findFirst({
      where: {
        id: data.clientUserId,
        role: UserRole.CLIENT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!clientUser) {
      throw new Error("Conta de cliente não encontrada.");
    }

    if (!clientUser.phone) {
      throw new Error("Atualize seu telefone no perfil antes de agendar.");
    }

    if (!data.serviceId || !data.professionalId) {
      throw new Error("Serviço e profissional são obrigatórios.");
    }

    if (!data.date || !data.startTime) {
      throw new Error("Data e horário são obrigatórios.");
    }

    if (!isValidTimeBlock(data.startTime)) {
      throw new Error(
        "O horário deve estar em blocos de 30 minutos, como 08:00 ou 08:30."
      );
    }

    if (isAppointmentStartInPast(data.date, data.startTime)) {
      throw new Error(
        "Não é possível agendar um horário que já passou. Escolha um horário futuro."
      );
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

    if (!isInsideBusinessHours(data.startTime, endTime)) {
      throw new Error(
        "Esse horário está fora do expediente. Escolha um horário entre 08:00 e 18:00."
      );
    }

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

    let client = data.clientUserId
      ? await prisma.client.findFirst({
          where: {
            businessId: business.id,
            userId: data.clientUserId,
          },
        })
      : null;

    const clientSearchConditions = [];

    if (clientUser.phone) {
      clientSearchConditions.push({
        phone: clientUser.phone,
      });
    }

    if (clientUser.email) {
      clientSearchConditions.push({
        email: clientUser.email,
      });
    }

    if (!client && clientSearchConditions.length > 0) {
      client = await prisma.client.findFirst({
        where: {
          businessId: business.id,
          OR: clientSearchConditions,
        },
      });

      if (
        client &&
        data.clientUserId &&
        client.userId &&
        client.userId !== data.clientUserId
      ) {
        client = null;
      }
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          businessId: business.id,
          userId: clientUser.id,
          name: clientUser.name,
          phone: clientUser.phone,
          email: clientUser.email,
        },
      });
    } else {
      client = await prisma.client.update({
        where: {
          id: client.id,
        },
        data: {
          userId: client.userId || clientUser.id,
          name: clientUser.name,
          phone: clientUser.phone,
          email: clientUser.email,
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
