import { Router } from "express";

import { authController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/client/register", authController.registerClient);
authRoutes.post("/client/login", authController.loginClient);
authRoutes.post("/admin/login", authController.loginAdmin);
authRoutes.post("/login", authController.login);
