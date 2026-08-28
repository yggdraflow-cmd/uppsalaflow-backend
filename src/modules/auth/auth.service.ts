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
      <p>Olá, ${user.name}.</p>
      <p>Confirme seu e-mail para ativar sua conta no YggdraFlow.</p>
      <p>
        <a href="${confirmationUrl}">
          Confirmar meu e-mail
        </a>
      </p>
      <p>Este link expira em 30 minutos.</p>
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
