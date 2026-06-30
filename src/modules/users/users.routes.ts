import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { usersController } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", authMiddleware, usersController.me);
