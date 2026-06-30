import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { clientsController } from "./clients.controller";

export const clientsRoutes = Router();

clientsRoutes.use(authMiddleware);

clientsRoutes.post("/", clientsController.create);
clientsRoutes.get("/", clientsController.list);
clientsRoutes.get("/:id", clientsController.findById);
clientsRoutes.put("/:id", clientsController.update);
clientsRoutes.delete("/:id", clientsController.remove);
