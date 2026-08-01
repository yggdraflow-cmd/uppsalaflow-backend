import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { getUploadedImageUrl } from "../../middlewares/upload.middleware";
import { usersService } from "./users.service";
import { changePasswordSchema } from "./users.validations";

export const usersController = {
  async me(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const user = await usersService.me(userId);

    return response.json(user);
  },

  async updateProfileImage(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const file = request.file;

    if (!file) {
      throw new AppError("Imagem não enviada.", 400);
    }

    const profileImageUrl = getUploadedImageUrl("profile-images", file);
    const user = await usersService.updateProfileImage(userId, profileImageUrl);

    return response.json(user);
  },

  async changePassword(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const data = changePasswordSchema.parse(request.body);

    const result = await usersService.changePassword(userId, data);

    return response.json(result);
  },
};
