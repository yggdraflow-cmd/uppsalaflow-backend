import { z } from "zod";

export const businessSegmentValues = [
  "BARBERSHOP",
  "BEAUTY",
  "ODONTOLOGY",
  "VETERINARY",
  "WELLNESS",
  "OTHER",
] as const;

export const businessSpecialtyValues = [
  "BEAUTY_GENERAL",
  "HAIR",
  "NAILS",
  "LASHES",
  "MAKEUP",
  "SKINCARE",
  "EYEBROWS",
] as const;

export const createBusinessSchema = z.object({
  name: z.string().min(2, "Nome do negócio obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  slug: z.string().min(2, "Slug obrigatório."),
  segment: z.enum(businessSegmentValues).optional(),
  specialty: z.enum(businessSpecialtyValues).nullable().optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial();

export const updateBusinessSegmentSchema = z.object({
  segment: z.enum(businessSegmentValues),
  specialty: z.enum(businessSpecialtyValues).nullable().optional(),
});
