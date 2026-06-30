import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().min(2, "Nome do negócio obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  slug: z.string().min(2, "Slug obrigatório."),
});

export const updateBusinessSchema = createBusinessSchema.partial();
