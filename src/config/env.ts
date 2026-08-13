import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3333),
  jwtSecret: process.env.JWT_SECRET || "yggdraflow_dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  twoFactorEncryptionKey:
    process.env.TWO_FACTOR_ENCRYPTION_KEY || "",
};
