import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { professionalsController } from "./professionals.controller";

export const professionalsRoutes = Router();

professionalsRoutes.use(authMiddleware);

professionalsRoutes.post("/", professionalsController.create);
professionalsRoutes.get("/", professionalsController.list);
professionalsRoutes.get("/:id", professionalsController.findById);
professionalsRoutes.put("/:id", professionalsController.update);
professionalsRoutes.delete("/:id", professionalsController.remove);
