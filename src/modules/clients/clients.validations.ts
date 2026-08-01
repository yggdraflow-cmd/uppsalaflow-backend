import { z } from "zod";

export const createClientSchema = z.object({
  businessId: z.string().uuid("ID do negócio inválido."),
  name: z.string().min(2, "Nome do cliente obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema
  .omit({ businessId: true })
  .partial();
