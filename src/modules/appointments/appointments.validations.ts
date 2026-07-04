import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):(00|30)$/;

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid("ID do negócio inválido."),
  clientId: z.string().uuid("ID do cliente inválido."),
  professionalId: z.string().uuid("ID do profissional inválido."),
  serviceId: z.string().uuid("ID do serviço inválido."),
  date: z.string().datetime("Data inválida."),
  startTime: z
    .string()
    .regex(timeRegex, "O horário deve estar em blocos de 30 minutos, como 08:00 ou 08:30."),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});
