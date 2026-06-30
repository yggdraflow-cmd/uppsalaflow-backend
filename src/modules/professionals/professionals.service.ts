import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";

type ProfessionalInput = {
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
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

export const professionalsService = {
  async create(ownerId: string, data: ProfessionalInput) {
    await ensureBusinessOwner(ownerId, data.businessId);

    return prisma.professional.create({
      data,
    });
  },

  async list(ownerId: string, businessId: string) {
    await ensureBusinessOwner(ownerId, businessId);

    return prisma.professional.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    });
  },

  async findById(ownerId: string, id: string) {
    const professional = await prisma.professional.findFirst({
      where: {
        id,
        business: { ownerId },
      },
    });

    if (!professional) {
      throw new AppError("Profissional não encontrado.", 404);
    }

    return professional;
  },

  async update(ownerId: string, id: string, data: Partial<Omit<ProfessionalInput, "businessId">>) {
    await this.findById(ownerId, id);

    return prisma.professional.update({
      where: { id },
      data,
    });
  },

  async remove(ownerId: string, id: string) {
    await this.findById(ownerId, id);

    await prisma.professional.delete({
      where: { id },
    });

    return { message: "Profissional removido com sucesso." };
  },
};
