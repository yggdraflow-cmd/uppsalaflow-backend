import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import {
  CompanyStatus,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "../../database/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middlewares/error.middleware";

type RegisterInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type ClientRegisterInput = RegisterInput & {
  slug: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type LoginAccess = "BUSINESS" | "CLIENT" | "ADMIN";

type ClientUserData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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

async function findAvailableBusinessBySlug(slug: string) {
  const business = await prisma.business.findFirst({
    where: {
      slug: {
        equals: slug.trim(),
        mode: "insensitive",
      },
    },
    include: {
      subscription: true,
    },
  });

  if (
    !business ||
    business.status !== CompanyStatus.ACTIVE ||
    business.subscription?.status !== SubscriptionStatus.ACTIVE
  ) {
    throw new AppError(
      "O estabelecimento informado não está disponível para cadastro.",
      404
    );
  }

  return business;
}

async function ensureClientBusinessLink(
  businessId: string,
  user: ClientUserData
) {
  let client = await prisma.client.findFirst({
    where: {
      businessId,
      userId: user.id,
    },
  });

  if (!client) {
    client = await prisma.client.findFirst({
      where: {
        businessId,
        OR: [
          {
            email: user.email,
          },
          ...(user.phone
            ? [
                {
                  phone: user.phone,
                },
              ]
            : []),
        ],
      },
    });

    if (client?.userId && client.userId !== user.id) {
      client = null;
    }
  }

  if (!client) {
    return prisma.client.create({
      data: {
        businessId,
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
    });
  }

  return prisma.client.update({
    where: {
      id: client.id,
    },
    data: {
      userId: client.userId || user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    },
  });
}

export const authService = {
  async register(data: RegisterInput) {
    return createUser(data, UserRole.OWNER);
  },

  async registerClient(data: ClientRegisterInput) {
    const business = await findAvailableBusinessBySlug(data.slug);

    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!existingUser) {
      const result = await createUser(data, UserRole.CLIENT);

      await ensureClientBusinessLink(business.id, {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
      });

      return result;
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

    await ensureClientBusinessLink(business.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });

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
};
