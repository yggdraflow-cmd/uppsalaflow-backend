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
    throw new Error("A senha do admin deve ter pelo menos 8 caracteres.");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: UserRole.ADMIN,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (existingAdmin) {
    throw new Error(
      `Já existe um usuário ADMIN cadastrado: ${existingAdmin.email}`
    );
  }

  const emailAlreadyExists = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (emailAlreadyExists) {
    throw new Error("Já existe um usuário com este e-mail.");
  }

  const passwordHash = await bcrypt.hash(password, 8);

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

  console.table([admin]);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
