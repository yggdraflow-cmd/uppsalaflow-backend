import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  authMiddleware,
  requireRoles,
} from "../../middlewares/auth.middleware";
import { authController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post(
  "/client/register",
  authController.registerClient
);
authRoutes.post(
  "/client/login",
  authController.loginClient
);
authRoutes.post(
  "/admin/login",
  authController.loginAdmin
);

authRoutes.post(
  "/admin/2fa/verify",
  authController.verifyAdminTwoFactorLogin
);

authRoutes.post("/login", authController.login);

authRoutes.post(
  "/admin/2fa/setup",
  authMiddleware,
  requireRoles(UserRole.ADMIN),
  authController.setupAdminTwoFactor
);

authRoutes.post(
  "/admin/2fa/confirm",
  authMiddleware,
  requireRoles(UserRole.ADMIN),
  authController.confirmAdminTwoFactor
);
