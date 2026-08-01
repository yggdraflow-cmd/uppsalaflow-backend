import { z } from "zod";

export const createServiceSchema = z.object({
  businessId: z.string().uuid("ID do negócio inválido."),
  name: z.string().min(2, "Nome do serviço obrigatório."),
  description: z.string().optional(),
  price: z.number().positive("Preço obrigatório."),
  durationMinutes: z.number().int().positive("Duração obrigatória."),
  category: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema
  .omit({ businessId: true })
  .partial();
