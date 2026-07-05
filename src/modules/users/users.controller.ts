import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { usersService } from "./users.service";
import { changePasswordSchema } from "./users.validations";

export const usersController = {
  async me(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const user = await usersService.me(userId);

    return response.json(user);
  },

  async changePassword(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const data = changePasswordSchema.parse(request.body);

    const result = await usersService.changePassword(userId, data);

    return response.json(result);
  },
};
