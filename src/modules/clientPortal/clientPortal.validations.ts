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

export const createAppointmentReviewSchema = z.object({
  rating: z
    .number()
    .int("A nota deve ser um número inteiro.")
    .min(1, "A nota mínima é 1.")
    .max(5, "A nota máxima é 5."),
  comment: z
    .string()
    .trim()
    .max(1000, "O comentário deve ter no máximo 1000 caracteres.")
    .optional(),
});
