import { BillingCycle } from "@prisma/client";
import { z } from "zod";

export const selectPlanSchema = z.object({
  businessId: z.string().uuid("Empresa inválida."),
  cycle: z.nativeEnum(BillingCycle),
});
