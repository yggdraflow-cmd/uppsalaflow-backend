import nodemailer from "nodemailer";

import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function ensureMailConfiguration() {
  if (
    !env.smtpHost ||
    !env.smtpUser ||
    !env.smtpPass ||
    !env.mailFrom
  ) {
    throw new AppError(
      "O serviço de e-mail não está configurado.",
      500
    );
  }
}

function createTransporter() {
  ensureMailConfiguration();

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: SendMailInput) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.mailFrom,
    to,
    subject,
    html,
    text,
  });
}
