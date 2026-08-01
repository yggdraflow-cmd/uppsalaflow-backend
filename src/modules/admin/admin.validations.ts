import { CompanyStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";

export const listAdminBusinessesQuerySchema = z.object({
  status: z.nativeEnum(CompanyStatus).optional(),
  search: z.string().trim().max(120).optional(),
});

export const listAdminPaymentsQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
});
