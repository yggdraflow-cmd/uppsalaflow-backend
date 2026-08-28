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
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Senha obrigatória."),
});

export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Informe o código de 6 dígitos."),
});

export const adminTwoFactorLoginSchema = z.object({
  challengeToken: z
    .string()
    .min(1, "Desafio de autenticação obrigatório."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Informe o código de 6 dígitos."),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Token de confirmação obrigatório."),
});
