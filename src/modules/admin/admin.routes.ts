import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  authMiddleware,
  requireRoles,
} from "../../middlewares/auth.middleware";
import { adminController } from "./admin.controller";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(requireRoles(UserRole.ADMIN));

adminRoutes.get("/health", (request, response) => {
  return response.json({
    status: "ok",
    area: "YggdraFlow Admin",
  });
});

adminRoutes.get("/overview", adminController.overview);
