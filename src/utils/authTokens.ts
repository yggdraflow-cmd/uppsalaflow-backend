import crypto from "crypto";

const TOKEN_EXPIRATION_MINUTES = 30;

export function generateAuthToken() {
  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000
  );

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

export function hashAuthToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}
