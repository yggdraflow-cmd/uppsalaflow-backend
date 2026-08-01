import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  authMiddleware,
  requireRoles,
} from "../../middlewares/auth.middleware";
import { billingController } from "./billing.controller";

export const billingRoutes = Router();

billingRoutes.get("/plans", billingController.listPlans);

billingRoutes.use(authMiddleware);

billingRoutes.post(
  "/select-plan",
  requireRoles(UserRole.OWNER),
  billingController.selectPlan
);

billingRoutes.get(
  "/status/:businessId",
  requireRoles(UserRole.OWNER),
  billingController.getStatus
);

billingRoutes.patch(
  "/admin/payments/:paymentId/confirm",
  requireRoles(UserRole.ADMIN),
  billingController.confirmPayment
);
