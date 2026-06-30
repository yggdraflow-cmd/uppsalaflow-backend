import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid("ID do negócio inválido."),
  clientId: z.string().uuid("ID do cliente inválido."),
  professionalId: z.string().uuid("ID do profissional inválido."),
  serviceId: z.string().uuid("ID do serviço inválido."),
  date: z.string().datetime("Data inválida."),
  startTime: z.string().min(4, "Horário inicial obrigatório."),
  endTime: z.string().min(4, "Horário final obrigatório."),
  price: z.number().positive("Preço obrigatório."),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});
