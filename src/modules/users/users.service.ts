import bcrypt from "bcryptjs";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export const usersService = {
  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return user;
  },

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const passwordMatches = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new AppError("Senha atual inválida.", 400);
    }

    const samePassword = await bcrypt.compare(
      data.newPassword,
      user.passwordHash
    );

    if (samePassword) {
      throw new AppError("A nova senha deve ser diferente da senha atual.", 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 8);

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash,
      },
    });

    return {
      message: "Senha alterada com sucesso.",
    };
  },
};
