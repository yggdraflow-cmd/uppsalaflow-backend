import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { adminService } from "./admin.service";

export const adminController = {
  async overview(request: AuthRequest, response: Response) {
    const overview = await adminService.overview();

    return response.json(overview);
  },
};
