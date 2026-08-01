import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável obrigatória não informada: ${name}`);
  }

  return value;
}

async function main() {
  const name = getRequiredEnv("ADMIN_NAME");
  const email = getRequiredEnv("ADMIN_EMAIL").toLowerCase();
  const password = getRequiredEnv("ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("A senha do Super Admin deve ter pelo menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 8);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
    },
  });

  if (existingAdmin) {
    if (existingAdmin.email !== email) {
      throw new Error(
        `Já existe um Super Admin cadastrado com o e-mail ${existingAdmin.email}.`
      );
    }

    const updatedAdmin = await prisma.user.update({
      where: {
        id: existingAdmin.id,
      },
      data: {
        name,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    console.log("Super Admin atualizado com sucesso.");
    console.table([updatedAdmin]);
    return;
  }

  const emailAlreadyExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (emailAlreadyExists) {
    throw new Error(
      "Este e-mail já pertence a outra conta e não pode ser promovido automaticamente."
    );
  }

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  console.log("Super Admin criado com sucesso.");
  console.table([admin]);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
