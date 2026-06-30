import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { businessesController } from "./businesses.controller";

export const businessesRoutes = Router();

businessesRoutes.use(authMiddleware);

businessesRoutes.post("/", businessesController.create);
businessesRoutes.get("/", businessesController.list);
businessesRoutes.get("/:id", businessesController.findById);
businessesRoutes.put("/:id", businessesController.update);
businessesRoutes.delete("/:id", businessesController.remove);
