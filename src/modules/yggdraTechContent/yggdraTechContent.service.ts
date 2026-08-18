import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { AppError } from "../../middlewares/error.middleware";
import {
  UpdateYggdraTechAboutInput,
  UpdateYggdraTechHomeInput,
  UpdateYggdraTechServicesInput,
} from "./yggdraTechContent.validations";

const ABOUT_KEY = "ABOUT";
const HOME_KEY = "HOME";
const SERVICES_KEY = "SERVICES";

const emptyHomeContent = {
  intro: {
    hello: "Olá.",
    title: "Transformamos ideias em",
    highlight: "soluções digitais.",
    description:
      "Sites, sistemas, automações e integrações desenvolvidos para fortalecer sua presença digital, organizar processos e fazer seu negócio evoluir.",
  },

  hero: {
    badge: "YggdraFlow para você",
    title: "Não escolha\nno escuro.",
    highlight: "Encontre o lugar certo.",
    description:
      "Descubra empresas, compare serviços e escolha onde quer ser atendido antes mesmo de fazer o agendamento.",
    exploreLabel: "Continue explorando",
    exploreHref: "#escolha-com-clareza",
  },

  clarity: {
    kicker: "Escolha com mais clareza",
    title: "Tudo começa\ncom uma boa escolha.",
    description:
      "Veja quem está disponível, conheça os serviços oferecidos e compare opções antes de decidir onde será seu próximo atendimento.",
  },

  information: {
    kicker: "Tudo antes de agendar",
    title: "Serviços.\nValores.\nTempo.",
    description:
      "Informação para você decidir com calma e ir direto ao que interessa.",
  },

  finalCta: {
    title: "Menos conversa.\nMais clareza.",
    description:
      "Escolha a empresa, conheça os serviços e siga para o agendamento. Sem depender de uma sequência interminável de mensagens para descobrir horário, preço ou duração.",
    buttonLabel: "Ver empresas",
    buttonHref: "/empresas",
  },

  social: {
    title: "Siga-nos nas redes sociais",
    links: [
      {
        id: "instagram",
        platform: "instagram",
        label: "Instagram",
        url: "https://www.instagram.com/yggdra_tech",
        order: 0,
      },
      {
        id: "x",
        platform: "x",
        label: "X",
        url: "https://twitter.com",
        order: 1,
      },
      {
        id: "linkedin",
        platform: "linkedin",
        label: "LinkedIn",
        url: "https://linkedin.com/company/yggdra-tech",
        order: 2,
      },
      {
        id: "email",
        platform: "email",
        label: "E-mail",
        url: "mailto:yggdratech@outlook.com",
        order: 3,
      },
    ],
  },

  footerText: "© 2026 Yggdra Tech. Todos os direitos reservados.",

  chatbot: {
    title: "Yggdra Bot",
    placeholder: "Digite sua mensagem...",
  },
};

const emptyAboutContent = {
  title: "",
  description: "",
  members: [],
};

const emptyServicesContent = {
  pageTitle: "",
  pageMessage: "",
  services: [],
};

function normalizeHomeContent(data: UpdateYggdraTechHomeInput) {
  return {
    intro: data.intro || emptyHomeContent.intro,
    hero: data.hero,
    clarity: data.clarity,
    information: data.information,
    finalCta: data.finalCta,
    social: {
      title: data.social.title,
      links: data.social.links
        .map((link) => ({
          id: link.id || randomUUID(),
          platform: link.platform,
          label: link.label,
          url: link.url,
          order: link.order,
        }))
        .sort((a, b) => a.order - b.order),
    },
    footerText: data.footerText,
    chatbot: data.chatbot,
  };
}

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
    pageTitle: data.pageTitle,
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

function applyHomeDefaults(content: Prisma.JsonValue) {
  const stored =
    typeof content === "object" &&
    content !== null &&
    !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};

  const storedIntro =
    typeof stored.intro === "object" &&
    stored.intro !== null &&
    !Array.isArray(stored.intro)
      ? (stored.intro as Record<string, unknown>)
      : {};

  return {
    ...emptyHomeContent,
    ...stored,
    intro: {
      ...emptyHomeContent.intro,
      ...storedIntro,
    },
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
  async getAdminHome() {
    const record = await prisma.yggdraTechContent.findUnique({
      where: {
        key: HOME_KEY,
      },
      select: contentSelect,
    });

    if (!record) {
      return {
        id: null,
        key: HOME_KEY,
        content: emptyHomeContent,
        published: false,
        createdAt: null,
        updatedAt: null,
        updatedBy: null,
      };
    }

    return {
      ...record,
      content: applyHomeDefaults(record.content),
    };
  },

  async updateHome(
    actorId: string,
    data: UpdateYggdraTechHomeInput
  ) {
    const content = normalizeHomeContent(data);

    return prisma.yggdraTechContent.upsert({
      where: {
        key: HOME_KEY,
      },
      create: {
        key: HOME_KEY,
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

  async getPublicHome() {
    const record = await prisma.yggdraTechContent.findFirst({
      where: {
        key: HOME_KEY,
        published: true,
      },
      select: {
        content: true,
        updatedAt: true,
      },
    });

    if (!record) {
      throw new AppError(
        "O conteúdo da Home ainda não está publicado.",
        404
      );
    }

    return {
      ...record,
      content: applyHomeDefaults(record.content),
    };
  },

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
