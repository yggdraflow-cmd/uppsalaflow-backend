import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  authMiddleware,
  requireRoles,
} from "../../middlewares/auth.middleware";
import { paymentSettingsController } from "./paymentSettings.controller";

export const paymentSettingsRoutes = Router();

paymentSettingsRoutes.use(authMiddleware);

paymentSettingsRoutes.get(
  "/payment-options/:cycle",
  requireRoles(UserRole.OWNER),
  paymentSettingsController.getActiveOption
);

paymentSettingsRoutes.get(
  "/admin/payment-options",
  requireRoles(UserRole.ADMIN),
  paymentSettingsController.listAdminOptions
);

paymentSettingsRoutes.put(
  "/admin/payment-options/:cycle",
  requireRoles(UserRole.ADMIN),
  paymentSettingsController.saveOption
);
