import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";
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

function createToken(userId: string, role: UserRole) {
  const options: SignOptions = {
    subject: userId,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign({ role }, env.jwtSecret, options);
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

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone?.trim() || null,
      passwordHash,
      role,
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

  const token = createToken(user.id, user.role);

  return { user, token };
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

    const token = createToken(user.id, sessionRole);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: sessionRole,
      },
      token,
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
};
