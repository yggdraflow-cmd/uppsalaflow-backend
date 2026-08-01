import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { clientsController } from "./clients.controller";

export const clientsRoutes = Router();

clientsRoutes.use(authMiddleware);

clientsRoutes.get("/", clientsController.list);
clientsRoutes.get("/:id", clientsController.findById);
clientsRoutes.put("/:id", clientsController.update);
