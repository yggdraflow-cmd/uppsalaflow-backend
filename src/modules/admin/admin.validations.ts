import { CompanyStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";

export const listAdminBusinessesQuerySchema = z.object({
  status: z.nativeEnum(CompanyStatus).optional(),
  search: z.string().trim().max(120).optional(),
});

export const listAdminPaymentsQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
});

export const approveBusinessBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const requiredBusinessReasonBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Informe um motivo com pelo menos 3 caracteres.")
    .max(500, "O motivo deve possuir no máximo 500 caracteres."),
});
