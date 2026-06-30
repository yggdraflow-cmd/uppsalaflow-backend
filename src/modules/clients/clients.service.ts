import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type ClientInput = {
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  notes?: string;
};

async function ensureBusinessOwner(ownerId: string, businessId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId },
  });

  if (!business) {
    throw new AppError("Negócio não encontrado.", 404);
  }
}

export const clientsService = {
  async create(ownerId: string, data: ClientInput) {
    await ensureBusinessOwner(ownerId, data.businessId);

    return prisma.client.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        notes: data.notes,
      },
    });
  },

  async list(ownerId: string, businessId: string) {
    await ensureBusinessOwner(ownerId, businessId);

    return prisma.client.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    });
  },

  async findById(ownerId: string, id: string) {
    const client = await prisma.client.findFirst({
      where: {
        id,
        business: { ownerId },
      },
    });

    if (!client) {
      throw new AppError("Cliente não encontrado.", 404);
    }

    return client;
  },

  async update(ownerId: string, id: string, data: Partial<Omit<ClientInput, "businessId">>) {
    await this.findById(ownerId, id);

    return prisma.client.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  },

  async remove(ownerId: string, id: string) {
    await this.findById(ownerId, id);

    await prisma.client.delete({
      where: { id },
    });

    return { message: "Cliente removido com sucesso." };
  },
};
