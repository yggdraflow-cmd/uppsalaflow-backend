import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  UpdateYggdraTechAboutInput,
  UpdateYggdraTechServicesInput,
} from "./yggdraTechContent.validations";

const ABOUT_KEY = "ABOUT";
const SERVICES_KEY = "SERVICES";

const emptyAboutContent = {
  title: "",
  description: "",
  members: [],
};

const emptyServicesContent = {
  pageMessage: "",
  services: [],
};

function normalizeAboutContent(data: UpdateYggdraTechAboutInput) {
  return {
    title: data.title,
    description: data.description,
    members: data.members
      .map((member) => ({
        id: member.id || randomUUID(),
        name: member.name,
        role: member.role,
        shortBio: member.shortBio,
        biography: member.biography,
        imageUrl: member.imageUrl || null,
        order: member.order,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

function normalizeServicesContent(
  data: UpdateYggdraTechServicesInput
) {
  return {
    pageMessage: data.pageMessage,
    services: data.services
      .map((service) => ({
        id: service.id || randomUUID(),
        title: service.title,
        description: service.description,
        offer: service.offer,
        imageUrl: service.imageUrl || null,
        link: service.link || null,
        order: service.order,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

const contentSelect = {
  id: true,
  key: true,
  content: true,
  published: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.YggdraTechContentSelect;

export const yggdraTechContentService = {
  async getAdminAbout() {
    const record = await prisma.yggdraTechContent.findUnique({
      where: {
        key: ABOUT_KEY,
      },
      select: contentSelect,
    });

    if (!record) {
      return {
        id: null,
        key: ABOUT_KEY,
        content: emptyAboutContent,
        published: false,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      };
    }

    return record;
  },

  async updateAbout(
    actorId: string,
    data: UpdateYggdraTechAboutInput
  ) {
    const content = normalizeAboutContent(data);

    return prisma.yggdraTechContent.upsert({
      where: {
        key: ABOUT_KEY,
      },
      create: {
        key: ABOUT_KEY,
        content: content as Prisma.InputJsonValue,
        published: data.published,
        updatedById: actorId,
      },
      update: {
        content: content as Prisma.InputJsonValue,
        published: data.published,
        updatedById: actorId,
      },
      select: contentSelect,
    });
  },

  async getPublicAbout() {
    const record = await prisma.yggdraTechContent.findFirst({
      where: {
        key: ABOUT_KEY,
        published: true,
      },
      select: {
        content: true,
        updatedAt: true,
      },
    });

    if (!record) {
      throw new AppError(
        "O conteúdo Quem Somos ainda não está publicado.",
        404
      );
    }

    return record;
  },

  async getAdminServices() {
    const record = await prisma.yggdraTechContent.findUnique({
      where: {
        key: SERVICES_KEY,
      },
      select: contentSelect,
    });

    if (!record) {
      return {
        id: null,
        key: SERVICES_KEY,
        content: emptyServicesContent,
        published: false,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      };
    }

    return record;
  },

  async updateServices(
    actorId: string,
    data: UpdateYggdraTechServicesInput
  ) {
    const content = normalizeServicesContent(data);

    return prisma.yggdraTechContent.upsert({
      where: {
        key: SERVICES_KEY,
      },
      create: {
        key: SERVICES_KEY,
        content: content as Prisma.InputJsonValue,
        published: data.published,
        updatedById: actorId,
      },
      update: {
        content: content as Prisma.InputJsonValue,
        published: data.published,
        updatedById: actorId,
      },
      select: contentSelect,
    });
  },

  async getPublicServices() {
    const record = await prisma.yggdraTechContent.findFirst({
      where: {
        key: SERVICES_KEY,
        published: true,
      },
      select: {
        content: true,
        updatedAt: true,
      },
    });

    if (!record) {
      throw new AppError(
        "O conteúdo Serviços ainda não está publicado.",
        404
      );
    }

    return record;
  },
};
