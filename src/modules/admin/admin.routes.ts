import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  yggdraTechAboutImageUpload,
  yggdraTechServiceImageUpload,
} from "../../middlewares/upload.middleware";

import {
  authMiddleware,
  requireRoles,
} from "../../middlewares/auth.middleware";
import { yggdraTechContentController } from "../yggdraTechContent/yggdraTechContent.controller";
import { adminController } from "./admin.controller";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(requireRoles(UserRole.ADMIN));

adminRoutes.get("/health", (request, response) => {
  return response.json({
    status: "ok",
    area: "YggdraFlow Platform Admin",
  });
});

adminRoutes.post(
  "/yggdratech/about/member-image",
  yggdraTechAboutImageUpload.single("image"),
  yggdraTechContentController.uploadMemberImage
);

adminRoutes.get(
  "/yggdratech/about",
  yggdraTechContentController.getAdminAbout
);

adminRoutes.put(
  "/yggdratech/about",
  yggdraTechContentController.updateAbout
);

adminRoutes.post(
  "/yggdratech/services/image",
  yggdraTechServiceImageUpload.single("image"),
  yggdraTechContentController.uploadServiceImage
);

adminRoutes.get(
  "/yggdratech/services",
  yggdraTechContentController.getAdminServices
);

adminRoutes.put(
  "/yggdratech/services",
  yggdraTechContentController.updateServices
);

adminRoutes.get("/overview", adminController.overview);
adminRoutes.get("/approvals", adminController.listApprovals);
adminRoutes.get("/payments", adminController.listPayments);
adminRoutes.get("/businesses", adminController.listBusinesses);
adminRoutes.get("/businesses/:id", adminController.findBusinessById);

adminRoutes.patch(
  "/businesses/:id/approve",
  adminController.approveBusiness
);

adminRoutes.patch(
  "/businesses/:id/reject",
  adminController.rejectBusiness
);

adminRoutes.patch(
  "/businesses/:id/block",
  adminController.blockBusiness
);

adminRoutes.patch(
  "/businesses/:id/suspend",
  adminController.suspendBusiness
);

adminRoutes.patch(
  "/businesses/:id/reactivate",
  adminController.reactivateBusiness
);
