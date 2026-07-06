import {
  AppointmentMessageSender,
  AppointmentProposalStatus,
  AppointmentStatus,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type RespondProposalInput = {
  userId: string;
  appointmentId: string;
  proposalId: string;
  status: "ACCEPTED" | "DECLINED";
  message?: string;
};

type CreateMessageInput = {
  userId: string;
  appointmentId: string;
  message: string;
};

const appointmentSelect = {
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
  proposals: {
    orderBy: {
      createdAt: "desc" as const,
    },
    select: {
      id: true,
      suggestedDate: true,
      suggestedStartTime: true,
      suggestedEndTime: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  messages: {
    orderBy: {
      createdAt: "asc" as const,
    },
    select: {
      id: true,
      sender: true,
      message: true,
      createdAt: true,
    },
  },
};

function normalizeAppointment(appointment: any) {
  return {
    ...appointment,
    date: appointment.date.toISOString().slice(0, 10),
    price: appointment.price.toString(),
    proposals: appointment.proposals.map((proposal: any) => ({
      ...proposal,
      suggestedDate: proposal.suggestedDate.toISOString().slice(0, 10),
    })),
  };
}

function createAppointmentDate(date: Date) {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00`);
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
  ignoredAppointmentId: string;
}) {
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      professionalId,
      date,
      id: {
        not: ignoredAppointmentId,
      },
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

async function findClientAppointment(userId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      client: {
        userId,
      },
    },
    include: {
      proposals: true,
    },
  });

  if (!appointment) {
    throw new AppError("Agendamento não encontrado.", 404);
  }

  return appointment;
}

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
      select: appointmentSelect,
    });

    return {
      appointments: appointments.map(normalizeAppointment),
    };
  },

  async respondProposal(data: RespondProposalInput) {
    const appointment = await findClientAppointment(
      data.userId,
      data.appointmentId
    );

    const proposal = appointment.proposals.find(
      (currentProposal) => currentProposal.id === data.proposalId
    );

    if (!proposal) {
      throw new AppError("Proposta não encontrada.", 404);
    }

    if (proposal.status !== AppointmentProposalStatus.PENDING) {
      throw new AppError("Essa proposta já foi respondida.", 400);
    }

    if (data.status === "ACCEPTED") {
      const suggestedDate = createAppointmentDate(proposal.suggestedDate);

      await ensureNoConflict({
        businessId: appointment.businessId,
        professionalId: appointment.professionalId,
        date: suggestedDate,
        startTime: proposal.suggestedStartTime,
        endTime: proposal.suggestedEndTime,
        ignoredAppointmentId: appointment.id,
      });

      await prisma.$transaction([
        prisma.appointmentProposal.update({
          where: {
            id: proposal.id,
          },
          data: {
            status: AppointmentProposalStatus.ACCEPTED,
          },
        }),
        prisma.appointmentProposal.updateMany({
          where: {
            appointmentId: appointment.id,
            id: {
              not: proposal.id,
            },
            status: AppointmentProposalStatus.PENDING,
          },
          data: {
            status: AppointmentProposalStatus.CANCELED,
          },
        }),
        prisma.appointment.update({
          where: {
            id: appointment.id,
          },
          data: {
            date: suggestedDate,
            startTime: proposal.suggestedStartTime,
            endTime: proposal.suggestedEndTime,
            status: AppointmentStatus.CONFIRMED,
          },
        }),
        prisma.appointmentMessage.create({
          data: {
            appointmentId: appointment.id,
            sender: AppointmentMessageSender.CLIENT,
            message:
              data.message ||
              "Cliente aceitou a sugestão de novo horário.",
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.appointmentProposal.update({
          where: {
            id: proposal.id,
          },
          data: {
            status: AppointmentProposalStatus.DECLINED,
          },
        }),
        prisma.appointmentMessage.create({
          data: {
            appointmentId: appointment.id,
            sender: AppointmentMessageSender.CLIENT,
            message:
              data.message ||
              "Cliente recusou a sugestão de novo horário.",
          },
        }),
      ]);
    }

    const appointments = await clientPortalService.listAppointments(data.userId);

    return appointments.appointments.find(
      (currentAppointment) => currentAppointment.id === data.appointmentId
    );
  },

  async createMessage(data: CreateMessageInput) {
    await findClientAppointment(data.userId, data.appointmentId);

    await prisma.appointmentMessage.create({
      data: {
        appointmentId: data.appointmentId,
        sender: AppointmentMessageSender.CLIENT,
        message: data.message,
      },
    });

    const appointments = await clientPortalService.listAppointments(data.userId);

    return appointments.appointments.find(
      (currentAppointment) => currentAppointment.id === data.appointmentId
    );
  },
};
