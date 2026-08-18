import { z } from "zod";

export const yggdraTechAboutMemberSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do integrante.")
    .max(120, "O nome deve possuir no máximo 120 caracteres."),
  role: z
    .string()
    .trim()
    .min(2, "Informe a função do integrante.")
    .max(160, "A função deve possuir no máximo 160 caracteres."),
  shortBio: z
    .string()
    .trim()
    .min(2, "Informe o resumo do integrante.")
    .max(500, "O resumo deve possuir no máximo 500 caracteres."),
  biography: z
    .string()
    .trim()
    .min(2, "Informe a biografia do integrante.")
    .max(4000, "A biografia deve possuir no máximo 4000 caracteres."),
  imageUrl: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  order: z.number().int().min(0).max(1000),
});

export const updateYggdraTechAboutBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Informe o título da seção.")
    .max(160, "O título deve possuir no máximo 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição da seção.")
    .max(2000, "A descrição deve possuir no máximo 2000 caracteres."),
  members: z
    .array(yggdraTechAboutMemberSchema)
    .max(20, "O Quem Somos aceita no máximo 20 integrantes."),
  published: z.boolean(),
});

export const yggdraTechServiceItemSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  title: z
    .string()
    .trim()
    .min(2, "Informe o título do serviço.")
    .max(160, "O título deve possuir no máximo 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição do serviço.")
    .max(2000, "A descrição deve possuir no máximo 2000 caracteres."),
  offer: z
    .string()
    .trim()
    .min(2, "Informe o que o serviço oferece.")
    .max(4000, "O conteúdo da oferta deve possuir no máximo 4000 caracteres."),
  imageUrl: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  link: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),
  order: z.number().int().min(0).max(1000),
});

export const updateYggdraTechServicesBodySchema = z.object({
  pageMessage: z
    .string()
    .trim()
    .max(2000, "A mensagem deve possuir no máximo 2000 caracteres."),
  services: z
    .array(yggdraTechServiceItemSchema)
    .max(50, "A página aceita no máximo 50 serviços."),
  published: z.boolean(),
});

export type UpdateYggdraTechAboutInput = z.infer<
  typeof updateYggdraTechAboutBodySchema
>;

export type UpdateYggdraTechServicesInput = z.infer<
  typeof updateYggdraTechServicesBodySchema
>;
