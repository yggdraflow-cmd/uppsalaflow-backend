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
  pageTitle: z
    .string()
    .trim()
    .max(180, "O título da página deve possuir no máximo 180 caracteres."),
  pageMessage: z
    .string()
    .trim()
    .max(2000, "A mensagem deve possuir no máximo 2000 caracteres."),
  services: z
    .array(yggdraTechServiceItemSchema)
    .max(50, "A página aceita no máximo 50 serviços."),
  published: z.boolean(),
});

export const yggdraTechHomeSectionSchema = z.object({
  kicker: z.string().trim().max(160).optional(),
  title: z.string().trim().max(300),
  description: z.string().trim().max(2000),
});

export const yggdraTechHomeSocialLinkSchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  platform: z.enum(["instagram", "x", "linkedin", "email"]),
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(1000),
  order: z.number().int().min(0).max(1000),
});

export const updateYggdraTechHomeBodySchema = z.object({
  intro: z
    .object({
      hello: z
        .string()
        .trim()
        .max(80, "O texto inicial deve possuir no máximo 80 caracteres."),
      title: z
        .string()
        .trim()
        .max(200, "O título deve possuir no máximo 200 caracteres."),
      highlight: z
        .string()
        .trim()
        .max(160, "O destaque deve possuir no máximo 160 caracteres."),
      description: z
        .string()
        .trim()
        .max(1200, "A descrição deve possuir no máximo 1200 caracteres."),
    })
    .optional(),

  hero: z.object({
    badge: z.string().trim().max(160),
    title: z.string().trim().max(300),
    highlight: z.string().trim().max(300),
    description: z.string().trim().max(2000),
    exploreLabel: z.string().trim().max(160),
    exploreHref: z.string().trim().max(1000),
  }),

  clarity: yggdraTechHomeSectionSchema,

  information: yggdraTechHomeSectionSchema,

  finalCta: z.object({
    title: z.string().trim().max(300),
    description: z.string().trim().max(2000),
    buttonLabel: z.string().trim().max(160),
    buttonHref: z.string().trim().max(1000),
  }),

  social: z.object({
    title: z.string().trim().max(200),
    links: z
      .array(yggdraTechHomeSocialLinkSchema)
      .max(10, "A Home aceita no máximo 10 links sociais."),
  }),

  footerText: z.string().trim().max(500),

  chatbot: z.object({
    title: z.string().trim().max(120),
    placeholder: z.string().trim().max(200),
  }),

  published: z.boolean(),
});

export type UpdateYggdraTechHomeInput = z.infer<
  typeof updateYggdraTechHomeBodySchema
>;

export type UpdateYggdraTechAboutInput = z.infer<
  typeof updateYggdraTechAboutBodySchema
>;

export type UpdateYggdraTechServicesInput = z.infer<
  typeof updateYggdraTechServicesBodySchema
>;
