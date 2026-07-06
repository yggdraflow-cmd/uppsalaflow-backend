import { z } from "zod";

export const respondAppointmentProposalSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  message: z.string().max(1000).optional(),
});

export const createClientAppointmentMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Mensagem é obrigatória.")
    .max(1000, "A mensagem deve ter no máximo 1000 caracteres."),
});
