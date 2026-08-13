import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import {
  generateSecret,
  generateURI,
  verifySync,
} from "otplib";

import { env } from "../config/env";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const configuredKey = env.twoFactorEncryptionKey.trim();

  if (!configuredKey) {
    throw new Error(
      "TWO_FACTOR_ENCRYPTION_KEY não está configurada."
    );
  }

  const key = Buffer.from(configuredKey, "base64");

  if (key.length !== 32) {
    throw new Error(
      "TWO_FACTOR_ENCRYPTION_KEY deve conter exatamente 32 bytes codificados em Base64."
    );
  }

  return key;
}

export function generateTwoFactorSecret() {
  return generateSecret({
    length: 20,
  });
}

export function generateTwoFactorUri(
  email: string,
  secret: string
) {
  return generateURI({
    issuer: "YggdraFlow",
    label: email.trim().toLowerCase(),
    secret,
  });
}

export function verifyTwoFactorCode(
  secret: string,
  token: string
) {
  const normalizedToken = token.trim();

  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }

  const result = verifySync({
    secret,
    token: normalizedToken,
    epochTolerance: 30,
  });

  return result.valid;
}

export function encryptTwoFactorSecret(secret: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptTwoFactorSecret(
  encryptedSecret: string
) {
  const parts = encryptedSecret.split(":");

  if (parts.length !== 4) {
    throw new Error(
      "Segredo de autenticação em dois fatores inválido."
    );
  }

  const [version, ivBase64, authTagBase64, dataBase64] =
    parts;

  if (version !== ENCRYPTION_VERSION) {
    throw new Error(
      "Versão de criptografia de dois fatores não suportada."
    );
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(dataBase64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error(
      "IV de autenticação em dois fatores inválido."
    );
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      "Tag de autenticação em dois fatores inválida."
    );
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
