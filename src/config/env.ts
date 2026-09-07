import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  jwtSecret: process.env.JWT_SECRET || "yggdraflow_dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  twoFactorEncryptionKey:
    process.env.TWO_FACTOR_ENCRYPTION_KEY || "",

  frontendUrl: process.env.FRONTEND_URL || "",

  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "",
};
