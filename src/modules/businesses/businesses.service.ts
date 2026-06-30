import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type BusinessInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  slug: string;
};

export const businessesService = {
  async create(ownerId: string, data: BusinessInput) {
    const slugAlreadyExists = await prisma.business.findUnique({
      where: { slug: data.slug },
    });

    if (slugAlreadyExists) {
      throw new AppError("Este slug já está em uso.", 409);
    }

    return prisma.business.create({
      data: {
        ...data,
        ownerId,
      },
    });
  },

  async list(ownerId: string) {
    return prisma.business.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(ownerId: string, businessId: string) {
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId },
    });

    if (!business) {
      throw new AppError("Negócio não encontrado.", 404);
    }

    return business;
  },

  async update(ownerId: string, businessId: string, data: Partial<BusinessInput>) {
    await this.findById(ownerId, businessId);

    if (data.slug) {
      const slugAlreadyExists = await prisma.business.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: businessId },
        },
      });

      if (slugAlreadyExists) {
        throw new AppError("Este slug já está em uso.", 409);
      }
    }

    return prisma.business.update({
      where: { id: businessId },
      data,
    });
  },

  async remove(ownerId: string, businessId: string) {
    await this.findById(ownerId, businessId);

    await prisma.business.delete({
      where: { id: businessId },
    });

    return { message: "Negócio removido com sucesso." };
  },
};
