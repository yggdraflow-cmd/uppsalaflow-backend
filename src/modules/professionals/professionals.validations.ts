import { z } from "zod";

export const createProfessionalSchema = z.object({
  businessId: z.string().uuid("ID do negócio inválido."),
  name: z.string().min(2, "Nome do profissional obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  active: z.boolean().optional(),
});

export const updateProfessionalSchema = createProfessionalSchema
  .omit({ businessId: true })
  .partial();
