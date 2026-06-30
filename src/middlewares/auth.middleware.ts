import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./error.middleware";

export type JwtPayload = {
  sub: string;
  role: string;
};

export type AuthRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

export function authMiddleware(
  request: AuthRequest,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token não informado.", 401);
  }

  const [, token] = authHeader.split(" ");

  if (!token) {
    throw new AppError("Token inválido.", 401);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    request.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    return next();
  } catch {
    throw new AppError("Token inválido ou expirado.", 401);
  }
}
