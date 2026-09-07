import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
import {
  generateAuthToken,
  hashAuthToken,
} from "../../utils/authTokens";
import { sendMail } from "../../utils/mail";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  generateTwoFactorSecret,
  generateTwoFactorUri,
  verifyTwoFactorCode,
} from "../../utils/twoFactor";

type RegisterInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type ClientRegisterInput = RegisterInput;

type LoginInput = {
  email: string;
  password: string;
};

type LoginAccess = "BUSINESS" | "CLIENT" | "ADMIN";

type AdminTwoFactorChallengePayload = {
  sub: string;
  role: UserRole;
  purpose: "ADMIN_2FA";
};

function createToken(userId: string, role: UserRole) {
  const options: SignOptions = {
    subject: userId,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      role,
      purpose: "SESSION",
    },
    env.jwtSecret,
    options
  );
}

function createAdminTwoFactorChallengeToken(userId: string) {
  const options: SignOptions = {
    subject: userId,
    expiresIn: "5m",
  };

  return jwt.sign(
    {
      role: UserRole.ADMIN,
      purpose: "ADMIN_2FA",
    },
    env.jwtSecret,
    options
  );
}

async function createUser(data: RegisterInput, role: UserRole) {
  const normalizedEmail = data.email.toLowerCase().trim();

  const emailAlreadyExists = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (emailAlreadyExists) {
    throw new AppError("Já existe um usuário com este e-mail.", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 8);
  const emailVerification = generateAuthToken();

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim() || null,
      passwordHash,
      role,
      emailVerificationTokenHash:
        emailVerification.tokenHash,
      emailVerificationExpiresAt:
        emailVerification.expiresAt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      role: true,
      createdAt: true,
    },
  });

  if (!env.frontendUrl) {
    throw new AppError(
      "A URL do frontend não está configurada.",
      500
    );
  }

  const confirmationUrl =
    `${env.frontendUrl}/confirm-email?token=${emailVerification.token}`;

  await sendMail({
    to: user.email,
    subject: "Confirme seu e-mail no YggdraFlow",
    text:
      "Confirme seu e-mail acessando o link: " +
      confirmationUrl,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #eef0f2;">
                      <div style="font-size:24px;font-weight:700;color:#111827;">
                        YggdraFlow
                      </div>

                      <div style="margin-top:6px;font-size:13px;color:#6b7280;">
                        Gestão inteligente para negócios com atendimento agendado
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
                        Confirme seu e-mail
                      </h1>

                      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                        Olá, <strong>${user.name}</strong>.
                      </p>

                      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                        Seu cadastro no YggdraFlow foi realizado.
                        Confirme seu endereço de e-mail para ativar sua conta e liberar o acesso à plataforma.
                      </p>

                      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                        <tr>
                          <td align="center">
                            <a
                              href="${confirmationUrl}"
                              style="display:inline-block;padding:14px 26px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;"
                            >
                              Confirmar meu e-mail
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="padding:16px;background:#f9fafb;border-radius:10px;margin-bottom:24px;">
                        <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                          Por segurança, este link expira em <strong>30 minutos</strong> e só pode ser utilizado uma vez.
                        </p>
                      </div>

                      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">
                        Se você não realizou este cadastro, ignore este e-mail.
                      </p>

                      <p style="margin:24px 0 8px;font-size:12px;color:#9ca3af;">
                        Se o botão não funcionar, copie e cole este endereço no navegador:
                      </p>

                      <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                        <a href="${confirmationUrl}" style="color:#4b5563;">
                          ${confirmationUrl}
                        </a>
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:20px 32px;text-align:center;background:#fafafa;border-top:1px solid #eef0f2;">
                      <p style="margin:0;font-size:12px;color:#9ca3af;">
                        Este é um e-mail automático do YggdraFlow.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  return {
    user,
    requiresEmailVerification: true,
    message:
      "Cadastro realizado. Confirme seu e-mail para acessar o YggdraFlow.",
  };
}

export const authService = {
  async register(data: RegisterInput) {
    return createUser(data, UserRole.OWNER);
  },

  async registerClient(data: ClientRegisterInput) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!existingUser) {
      return createUser(data, UserRole.CLIENT);
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      existingUser.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError(
        "Este e-mail já possui uma conta. Informe a senha atual dessa conta para acessar como cliente.",
        401
      );
    }

    if (!existingUser.emailVerifiedAt) {
      throw new AppError(
        "Confirme seu e-mail antes de acessar como cliente.",
        403
      );
    }

    let user = existingUser;

    if (!user.phone && data.phone?.trim()) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          phone: data.phone.trim(),
        },
      });
    }

    const token = createToken(user.id, UserRole.CLIENT);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: UserRole.CLIENT,
        createdAt: user.createdAt,
      },
      token,
    };
  },

  async login(data: LoginInput, access: LoginAccess) {
    const user = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase().trim(),
      },
    });

    if (!user) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }


    const passwordMatches = await bcrypt.compare(
      data.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    if (!user.emailVerifiedAt) {
      throw new AppError(
        "Confirme seu e-mail antes de acessar sua conta.",
        403
      );
    }

    if (access === "ADMIN" && user.role !== UserRole.ADMIN) {
      throw new AppError(
        "Esta conta não possui acesso ao Super Admin.",
        403
      );
    }

    if (access === "BUSINESS" && user.role === UserRole.CLIENT) {
      throw new AppError(
        "Este e-mail pertence a uma conta de cliente. Use o acesso de cliente.",
        403
      );
    }

    if (access === "BUSINESS" && user.role === UserRole.ADMIN) {
      throw new AppError(
        "Esta conta pertence ao Super Admin. Use o acesso administrativo.",
        403
      );
    }

    const sessionRole =
      access === "CLIENT" ? UserRole.CLIENT : user.role;

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      role: sessionRole,
    };

    if (
      access === "ADMIN" &&
      user.role === UserRole.ADMIN &&
      user.twoFactorEnabled
    ) {
      if (!user.twoFactorSecretEncrypted) {
        throw new AppError(
          "O Super Admin possui 2FA ativo, mas não há segredo configurado.",
          409
        );
      }

      return {
        requiresTwoFactor: true,
        challengeToken:
          createAdminTwoFactorChallengeToken(user.id),
        user: sessionUser,
      };
    }

    const token = createToken(user.id, sessionRole);

    return {
      requiresTwoFactor: false,
      user: sessionUser,
      token,
    };
  },

  async verifyAdminTwoFactorLogin(
    challengeToken: string,
    code: string
  ) {
    let decoded: AdminTwoFactorChallengePayload;

    try {
      decoded = jwt.verify(
        challengeToken,
        env.jwtSecret
      ) as AdminTwoFactorChallengePayload;
    } catch {
      throw new AppError(
        "Desafio de autenticação inválido ou expirado.",
        401
      );
    }

    if (
      decoded.purpose !== "ADMIN_2FA" ||
      decoded.role !== UserRole.ADMIN ||
      !decoded.sub
    ) {
      throw new AppError(
        "Desafio de autenticação inválido.",
        401
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecretEncrypted: true,
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new AppError(
        "Super Admin não encontrado.",
        404
      );
    }

    if (
      !user.twoFactorEnabled ||
      !user.twoFactorSecretEncrypted
    ) {
      throw new AppError(
        "A autenticação em dois fatores não está ativa.",
        409
      );
    }

    const secret = decryptTwoFactorSecret(
      user.twoFactorSecretEncrypted
    );

    if (!verifyTwoFactorCode(secret, code)) {
      throw new AppError(
        "Código de autenticação inválido.",
        401
      );
    }

    const token = createToken(
      user.id,
      UserRole.ADMIN
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: UserRole.ADMIN,
      },
    };
  },

  async setupAdminTwoFactor(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new AppError(
        "Super Admin não encontrado.",
        404
      );
    }

    if (user.twoFactorEnabled) {
      throw new AppError(
        "A autenticação em dois fatores já está ativada.",
        409
      );
    }

    const secret = generateTwoFactorSecret();
    const encryptedSecret =
      encryptTwoFactorSecret(secret);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorSecretEncrypted: encryptedSecret,
        twoFactorEnabled: false,
        twoFactorEnabledAt: null,
      },
    });

    return {
      otpauthUri: generateTwoFactorUri(
        user.email,
        secret
      ),
      manualKey: secret,
    };
  },

  async confirmAdminTwoFactor(
    userId: string,
    code: string
  ) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecretEncrypted: true,
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new AppError(
        "Super Admin não encontrado.",
        404
      );
    }

    if (user.twoFactorEnabled) {
      throw new AppError(
        "A autenticação em dois fatores já está ativada.",
        409
      );
    }

    if (!user.twoFactorSecretEncrypted) {
      throw new AppError(
        "Inicie a configuração do autenticador antes de confirmar o código.",
        409
      );
    }

    const secret = decryptTwoFactorSecret(
      user.twoFactorSecretEncrypted
    );

    if (!verifyTwoFactorCode(secret, code)) {
      throw new AppError(
        "Código de autenticação inválido.",
        401
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: new Date(),
      },
      select: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: true,
      },
    });

    return updatedUser;
  },

  async forgotPassword(
    email: string,
    mode: "business" | "client" = "business"
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    const genericResponse = {
      message:
        "Se existir uma conta com este e-mail, enviaremos as instruções para redefinir a senha.",
    };

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return genericResponse;
    }

    if (!env.frontendUrl) {
      throw new AppError(
        "A URL do frontend não está configurada.",
        500
      );
    }

    const passwordReset = generateAuthToken();

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash:
          passwordReset.tokenHash,
        passwordResetExpiresAt:
          passwordReset.expiresAt,
      },
    });

    const resetUrl =
      `${env.frontendUrl}/reset-password?token=${passwordReset.token}&mode=${mode}`;

    await sendMail({
      to: user.email,
      subject: "Redefinição de senha do YggdraFlow",
      text:
        "Para redefinir sua senha, acesse: " +
        resetUrl,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                    <tr>
                      <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #eef0f2;">
                        <div style="font-size:24px;font-weight:700;color:#111827;">
                          YggdraFlow
                        </div>
                        <div style="margin-top:6px;font-size:13px;color:#6b7280;">
                          Gestão inteligente para negócios com atendimento agendado
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:32px;">
                        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;">
                          Redefinição de senha
                        </h1>

                        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                          Olá, <strong>${user.name}</strong>.
                        </p>

                        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                          Recebemos uma solicitação para redefinir a senha da sua conta no YggdraFlow.
                          Clique no botão abaixo para criar uma nova senha.
                        </p>

                        <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                          <tr>
                            <td align="center">
                              <a
                                href="${resetUrl}"
                                style="display:inline-block;padding:14px 26px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;"
                              >
                                Redefinir minha senha
                              </a>
                            </td>
                          </tr>
                        </table>

                        <div style="padding:16px;background:#f9fafb;border-radius:10px;margin-bottom:24px;">
                          <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                            Por segurança, este link expira em <strong>30 minutos</strong> e só pode ser utilizado uma vez.
                          </p>
                        </div>

                        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">
                          Se você não solicitou esta redefinição, ignore este e-mail. Sua senha continuará a mesma.
                        </p>

                        <p style="margin:24px 0 8px;font-size:12px;color:#9ca3af;">
                          Se o botão não funcionar, copie e cole este endereço no navegador:
                        </p>

                        <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                          <a href="${resetUrl}" style="color:#4b5563;">
                            ${resetUrl}
                          </a>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:20px 32px;text-align:center;background:#fafafa;border-top:1px solid #eef0f2;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;">
                          Este é um e-mail automático do YggdraFlow.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return genericResponse;
  },

  async resetPassword(
    token: string,
    password: string
  ) {
    const tokenHash = hashAuthToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
      },
      select: {
        id: true,
        passwordResetExpiresAt: true,
      },
    });

    if (!user) {
      throw new AppError(
        "Token de recuperação inválido.",
        400
      );
    }

    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError(
        "Token de recuperação expirado.",
        400
      );
    }

    const passwordHash = await bcrypt.hash(password, 8);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return {
      message: "Senha redefinida com sucesso.",
    };
  },

  async verifyEmail(token: string) {
    const tokenHash = hashAuthToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
      },
      select: {
        id: true,
        emailVerificationExpiresAt: true,
      },
    });

    if (!user) {
      throw new AppError(
        "Token de confirmação inválido.",
        400
      );
    }

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError(
        "Token de confirmação expirado.",
        400
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    return {
      message: "E-mail confirmado com sucesso.",
    };
  },

};
