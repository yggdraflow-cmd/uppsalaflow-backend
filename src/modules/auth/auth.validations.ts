import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome obrigatório."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const clientRegisterSchema = z.object({
  name: z.string().min(2, "Nome obrigatório."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(8, "Telefone obrigatório."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  slug: z.string().min(1, "Estabelecimento obrigatório."),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Senha obrigatória."),
});
