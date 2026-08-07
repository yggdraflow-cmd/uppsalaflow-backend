import { CompanyStatus } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { synchronizeBusinessBilling } from "../billing/billingLifecycle.service";

type BusinessSegment =
  | "BARBERSHOP"
  | "BEAUTY"
  | "ODONTOLOGY"
  | "VETERINARY"
  | "WELLNESS"
  | "OTHER";

type BusinessSpecialty =
  | "BEAUTY_GENERAL"
  | "HAIR"
  | "NAILS"
  | "LASHES"
  | "MAKEUP"
  | "SKINCARE"
  | "EYEBROWS";

type BusinessInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  slug: string;
  segment?: BusinessSegment;
  specialty?: BusinessSpecialty | null;
};

type BusinessSegmentInput = {
  segment: BusinessSegment;
  specialty?: BusinessSpecialty | null;
};

function normalizeSegmentData(data: BusinessSegmentInput) {
  if (data.segment === "BEAUTY" && !data.specialty) {
    throw new AppError("Escolha uma especialidade para estética.", 400);
  }

  if (data.segment !== "BEAUTY" && data.specialty) {
    throw new AppError("Especialidade só pode ser usada para estética.", 400);
  }

  return {
    segment: data.segment,
    specialty: data.segment === "BEAUTY" ? data.specialty : null,
  };
}

const businessRelations = {
  subscription: true,
  payments: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
  },
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
        status: CompanyStatus.PENDING,
        statusReason: "Aguardando escolha do plano.",
      },
      include: businessRelations,
    });
  },

  async list(ownerId: string) {
    const businessIds = await prisma.business.findMany({
      where: { ownerId },
      select: {
        id: true,
      },
    });

    const billingEntries = await Promise.all(
      businessIds.map(async (business) => [
        business.id,
        await synchronizeBusinessBilling(business.id),
      ] as const)
    );

    const billingByBusinessId = new Map(billingEntries);

    const businesses = await prisma.business.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: businessRelations,
    });

    return businesses.map((business) => ({
      ...business,
      billing: billingByBusinessId.get(business.id),
    }));
  },

  async findById(ownerId: string, businessId: string) {
    const ownedBusiness = await prisma.business.findFirst({
      where: { id: businessId, ownerId },
      select: {
        id: true,
      },
    });

    if (!ownedBusiness) {
      throw new AppError("Negócio não encontrado.", 404);
    }

    const billing =
      await synchronizeBusinessBilling(businessId);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: businessRelations,
    });

    return {
      ...business,
      billing,
    };
  },

  async update(
    ownerId: string,
    businessId: string,
    data: Partial<BusinessInput>
  ) {
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
      include: businessRelations,
    });
  },

  async updateLogo(
    ownerId: string,
    businessId: string,
    logoUrl: string
  ) {
    await this.findById(ownerId, businessId);

    return prisma.business.update({
      where: { id: businessId },
      data: {
        logoUrl,
      },
      include: businessRelations,
    });
  },

  async updateCover(
    ownerId: string,
    businessId: string,
    coverImageUrl: string
  ) {
    await this.findById(ownerId, businessId);

    return prisma.business.update({
      where: { id: businessId },
      data: {
        coverImageUrl,
      },
      include: businessRelations,
    });
  },

  async removeCover(
    ownerId: string,
    businessId: string
  ) {
    await this.findById(ownerId, businessId);

    return prisma.business.update({
      where: { id: businessId },
      data: {
        coverImageUrl: null,
      },
      include: businessRelations,
    });
  },

  async updateSegment(
    ownerId: string,
    businessId: string,
    data: BusinessSegmentInput
  ) {
    await this.findById(ownerId, businessId);

    const normalizedData = normalizeSegmentData(data);

    return prisma.business.update({
      where: { id: businessId },
      data: normalizedData,
      include: businessRelations,
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
