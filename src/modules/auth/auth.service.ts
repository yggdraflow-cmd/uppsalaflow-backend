import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";

type RegisterInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

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
      name: data.name,
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

  async registerClient(data: RegisterInput) {
    return createUser(data, UserRole.CLIENT);
  },

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const token = createToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      },
      token,
    };
  },
};
