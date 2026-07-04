import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { appointmentsController } from "./appointments.controller";

export const appointmentsRoutes = Router();

appointmentsRoutes.use(authMiddleware);

appointmentsRoutes.post("/", appointmentsController.create);
appointmentsRoutes.get("/", appointmentsController.listByDay);
appointmentsRoutes.get("/history", appointmentsController.listHistory);
appointmentsRoutes.patch("/:id/status", appointmentsController.updateStatus);