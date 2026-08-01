import {
  AppointmentMessageSender,
  AppointmentStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type AppointmentInput = {
  businessId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes?: string;
};

type AppointmentProposalInput = {
  date: string;
  startTime: string;
  message: string;
};

const BUSINESS_OPEN_TIME = "08:00";
const BUSINESS_CLOSE_TIME = "18:00";

const appointmentInclude = {
  client: true,
  professional: true,
  service: true,
  proposals: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  messages: {
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

function createAppointmentDate(date: string) {
  const dateOnly = date.split("T")[0];

  return new Date(`${dateOnly}T00:00:00`);
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date(2000, 0, 1, hours, minutes);
  date.setMinutes(date.getMinutes() + minutesToAdd);

  const finalHours = String(date.getHours()).padStart(2, "0");
  const finalMinutes = String(date.getMinutes()).padStart(2, "0");

  return `${finalHours}:${finalMinutes}`;
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

async function ensureNoConflict({
  businessId,
  professionalId,
  date,
  startTime,
  endTime,
  ignoredAppointmentId,
}: {
  businessId: string;
  professionalId: string;
  date: Date;
  startTime: string;
  endTime: string;
  ignoredAppointmentId?: string;
}) {
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      professionalId,
      date,
      id: ignoredAppointmentId
        ? {
            not: ignoredAppointmentId,
          }
        : undefined,
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
      startTime,
      endTime,
      appointment.startTime,
      appointment.endTime
    )
  );

  if (conflictingAppointment) {
    throw new AppError(
      "Esse horário já está ocupado para este profissional.",
      400
    );
  }
}

export const appointmentsService = {
  async create(ownerId: string, data: AppointmentInput) {
    await ensureBusinessOwner(ownerId, data.businessId);

    if (!isValidTimeBlock(data.startTime)) {
      throw new AppError(
        "O horário deve estar em blocos de 30 minutos, como 08:00 ou 08:30.",
        400
      );
    }

    const [client, professional, service] = await Promise.all([
      prisma.client.findFirst({
        where: {
          id: data.clientId,
          businessId: data.businessId,
        },
      }),
      prisma.professional.findFirst({
        where: {
          id: data.professionalId,
          businessId: data.businessId,
          active: true,
        },
      }),
      prisma.service.findFirst({
        where: {
          id: data.serviceId,
          businessId: data.businessId,
          active: true,
        },
      }),
    ]);

    if (!client) {
      throw new AppError("Cliente não encontrado para este negócio.", 404);
    }

    if (!professional) {
      throw new AppError(
        "Profissional não encontrado ou inativo para este negócio.",
        404
      );
    }

    if (!service) {
      throw new AppError(
        "Serviço não encontrado ou inativo para este negócio.",
        404
      );
    }

    const appointmentDate = createAppointmentDate(data.date);
    const endTime = addMinutesToTime(data.startTime, service.durationMinutes);

    if (!isInsideBusinessHours(data.startTime, endTime)) {
      throw new AppError(
        "Esse horário está fora do expediente. Escolha um horário entre 08:00 e 18:00.",
        400
      );
    }

    await ensureNoConflict({
      businessId: data.businessId,
      professionalId: data.professionalId,
      date: appointmentDate,
      startTime: data.startTime,
      endTime,
    });

    return prisma.appointment.create({
      data: {
        businessId: data.businessId,
        clientId: data.clientId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        date: appointmentDate,
        startTime: data.startTime,
        endTime,
        price: service.price,
        notes: data.notes,
      },
      include: appointmentInclude,
    });
  },

  async listByDay(ownerId: string, businessId: string, date: string) {
    await ensureBusinessOwner(ownerId, businessId);

    const selectedDate = createAppointmentDate(date);
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
      include: appointmentInclude,
      orderBy: {
        startTime: "asc",
      },
    });
  },

  async listHistory(ownerId: string, businessId: string) {
    await ensureBusinessOwner(ownerId, businessId);

    return prisma.appointment.findMany({
      where: {
        businessId,
        status: {
          in: [
            AppointmentStatus.FINISHED,
            AppointmentStatus.CANCELED,
            AppointmentStatus.NO_SHOW,
          ],
        },
      },
      include: appointmentInclude,
      orderBy: [
        {
          date: "desc",
        },
        {
          startTime: "desc",
        },
      ],
    });
  },

  async listPending(ownerId: string, businessId: string) {
    await ensureBusinessOwner(ownerId, businessId);

    return prisma.appointment.findMany({
      where: {
        businessId,
        status: AppointmentStatus.SCHEDULED,
      },
      include: appointmentInclude,
      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });
  },

  async getThread(ownerId: string, id: string) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        business: {
          ownerId,
        },
      },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new AppError("Agendamento não encontrado.", 404);
    }

    return appointment;
  },

  async createProposal(
    ownerId: string,
    id: string,
    data: AppointmentProposalInput
  ) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        business: {
          ownerId,
        },
      },
      include: {
        service: true,
      },
    });

    if (!appointment) {
      throw new AppError("Agendamento não encontrado.", 404);
    }

    if (!isValidTimeBlock(data.startTime)) {
      throw new AppError(
        "O horário deve estar em blocos de 30 minutos, como 08:00 ou 08:30.",
        400
      );
    }

    const suggestedDate = createAppointmentDate(data.date);
    const suggestedEndTime = addMinutesToTime(
      data.startTime,
      appointment.service.durationMinutes
    );

    if (!isInsideBusinessHours(data.startTime, suggestedEndTime)) {
      throw new AppError(
        "Esse horário está fora do expediente. Escolha um horário entre 08:00 e 18:00.",
        400
      );
    }

    await ensureNoConflict({
      businessId: appointment.businessId,
      professionalId: appointment.professionalId,
      date: suggestedDate,
      startTime: data.startTime,
      endTime: suggestedEndTime,
      ignoredAppointmentId: appointment.id,
    });

    await prisma.appointmentProposal.create({
      data: {
        appointmentId: appointment.id,
        suggestedDate,
        suggestedStartTime: data.startTime,
        suggestedEndTime,
        message: data.message,
      },
    });

    await prisma.appointmentMessage.create({
      data: {
        appointmentId: appointment.id,
        sender: AppointmentMessageSender.OWNER,
        message: data.message,
      },
    });

    return appointmentsService.getThread(ownerId, id);
  },

  async createMessage(ownerId: string, id: string, message: string) {
    await appointmentsService.getThread(ownerId, id);

    await prisma.appointmentMessage.create({
      data: {
        appointmentId: id,
        sender: AppointmentMessageSender.OWNER,
        message,
      },
    });

    return appointmentsService.getThread(ownerId, id);
  },

  async updateStatus(ownerId: string, id: string, status: AppointmentStatus) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        business: {
          ownerId,
        },
      },
    });

    if (!appointment) {
      throw new AppError("Agendamento não encontrado.", 404);
    }

    return prisma.appointment.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: appointmentInclude,
    });
  },
};
