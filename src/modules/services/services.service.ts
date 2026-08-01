import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type ServiceInput = {
  businessId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  category?: string;
  active?: boolean;
};

async function ensureBusinessOwner(ownerId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new AppError("Negócio não encontrado.", 404);
  }
}

export const servicesService = {
  async create(ownerId: string, data: ServiceInput) {
    await ensureBusinessOwner(ownerId, data.businessId);

    return prisma.service.create({
      data,
    });
  },

  async list(ownerId: string, businessId: string) {
    await ensureBusinessOwner(ownerId, businessId);

    return prisma.service.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    });
  },

  async findById(ownerId: string, id: string) {
    const service = await prisma.service.findFirst({
      where: {
        id,
        business: { ownerId },
      },
    });

    if (!service) {
      throw new AppError("Serviço não encontrado.", 404);
    }

    return service;
  },

  async update(ownerId: string, id: string, data: Partial<Omit<ServiceInput, "businessId">>) {
    await this.findById(ownerId, id);

    return prisma.service.update({
      where: { id },
      data,
    });
  },

  async remove(ownerId: string, id: string) {
    await this.findById(ownerId, id);

    await prisma.service.delete({
      where: { id },
    });

    return { message: "Serviço removido com sucesso." };
  },
};
