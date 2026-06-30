import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { usersService } from "./users.service";

export const usersController = {
  async me(request: AuthRequest, response: Response) {
    const userId = request.user!.id;
    const user = await usersService.me(userId);

    return response.json(user);
  },
};
