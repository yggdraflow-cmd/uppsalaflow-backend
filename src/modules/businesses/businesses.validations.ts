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

const slugSchema = z
  .string()
  .min(2, "Slug obrigatório.")
  .max(60, "O slug deve ter no máximo 60 caracteres.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug inválido. Use apenas letras minúsculas, números e hífens."
  );

export const createBusinessSchema = z.object({
  name: z.string().min(2, "Nome do negócio obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  segment: z.enum(businessSegmentValues).optional(),
  specialty: z.enum(businessSpecialtyValues).nullable().optional(),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2, "Nome do negócio obrigatório.").optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  slug: slugSchema.optional(),
  segment: z.enum(businessSegmentValues).optional(),
  specialty: z.enum(businessSpecialtyValues).nullable().optional(),
});

export const updateBusinessSegmentSchema = z.object({
  segment: z.enum(businessSegmentValues),
  specialty: z.enum(businessSpecialtyValues).nullable().optional(),
});