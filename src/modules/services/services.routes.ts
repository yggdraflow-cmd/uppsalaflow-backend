import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { servicesController } from "./services.controller";

export const servicesRoutes = Router();

servicesRoutes.use(authMiddleware);

servicesRoutes.post("/", servicesController.create);
servicesRoutes.get("/", servicesController.list);
servicesRoutes.get("/:id", servicesController.findById);
servicesRoutes.put("/:id", servicesController.update);
servicesRoutes.delete("/:id", servicesController.remove);
