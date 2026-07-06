import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { appointmentsController } from "./appointments.controller";

export const appointmentsRoutes = Router();

appointmentsRoutes.use(authMiddleware);

appointmentsRoutes.post("/", appointmentsController.create);
appointmentsRoutes.get("/", appointmentsController.listByDay);
appointmentsRoutes.get("/history", appointmentsController.listHistory);
appointmentsRoutes.get("/pending", appointmentsController.listPending);
appointmentsRoutes.get("/:id/thread", appointmentsController.getThread);
appointmentsRoutes.post("/:id/proposals", appointmentsController.createProposal);
appointmentsRoutes.post("/:id/messages", appointmentsController.createMessage);
appointmentsRoutes.patch("/:id/status", appointmentsController.updateStatus);
