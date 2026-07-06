import { z } from "zod";

export const createAppointmentProposalSchema = z.object({
  date: z.string().min(1, "Data sugerida é obrigatória."),
  startTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):(00|30)$/,
      "O horário deve estar em blocos de 30 minutos, como 08:00 ou 08:30."
    ),
  message: z
    .string()
    .min(1, "Mensagem é obrigatória.")
    .max(1000, "A mensagem deve ter no máximo 1000 caracteres."),
});

export const createAppointmentMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Mensagem é obrigatória.")
    .max(1000, "A mensagem deve ter no máximo 1000 caracteres."),
});
