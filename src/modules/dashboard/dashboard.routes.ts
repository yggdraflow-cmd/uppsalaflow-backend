import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { dashboardController } from "./dashboard.controller";

export const dashboardRoutes = Router();

dashboardRoutes.use(authMiddleware);

dashboardRoutes.get("/summary", dashboardController.summary);
