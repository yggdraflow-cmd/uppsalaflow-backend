import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  businessCoverUpload,
  businessLogoUpload,
} from "../../middlewares/upload.middleware";
import { businessesController } from "./businesses.controller";

export const businessesRoutes = Router();

businessesRoutes.use(authMiddleware);

businessesRoutes.post("/", businessesController.create);
businessesRoutes.get("/", businessesController.list);
businessesRoutes.get("/:id", businessesController.findById);
businessesRoutes.put("/:id", businessesController.update);
businessesRoutes.patch(
  "/:id/logo",
  businessLogoUpload.single("image"),
  businessesController.updateLogo
);
businessesRoutes.patch(
  "/:id/cover",
  businessCoverUpload.single("image"),
  businessesController.updateCover
);
businessesRoutes.delete(
  "/:id/cover",
  businessesController.removeCover
);
businessesRoutes.patch("/:id/segment", businessesController.updateSegment);
businessesRoutes.delete("/:id", businessesController.remove);
