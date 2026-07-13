import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { profileImageUpload } from "../../middlewares/upload.middleware";
import { usersController } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.get("/me", authMiddleware, usersController.me);
usersRoutes.patch(
  "/me/profile-image",
  authMiddleware,
  profileImageUpload.single("image"),
  usersController.updateProfileImage
);
usersRoutes.patch("/me/password", authMiddleware, usersController.changePassword);
