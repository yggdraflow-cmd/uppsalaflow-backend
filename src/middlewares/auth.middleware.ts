import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { AppError } from "./error.middleware";

export type JwtPayload = {
  sub: string;
  role: UserRole;
  purpose?: "SESSION" | "ADMIN_2FA";
};

export type AuthRequest = Request & {
  user?: {
    id: string;
    role: UserRole;
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

  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(
      token,
      env.jwtSecret
    ) as JwtPayload;
  } catch {
    throw new AppError(
      "Token inválido ou expirado.",
      401
    );
  }

  if (decoded.purpose !== "SESSION") {
    throw new AppError(
      "Este token não autoriza acesso à aplicação.",
      401
    );
  }

  request.user = {
    id: decoded.sub,
    role: decoded.role,
  };

  return next();
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (
    request: AuthRequest,
    response: Response,
    next: NextFunction
  ) => {
    if (!request.user) {
      throw new AppError(
        "Usuário não autenticado.",
        401
      );
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        "Você não tem permissão para acessar este recurso.",
        403
      );
    }

    return next();
  };
}
