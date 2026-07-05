import { Response } from "express";
import { UserRole } from "@prisma/client";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { clientPortalService } from "./clientPortal.service";

export const clientPortalController = {
  async listAppointments(request: AuthRequest, response: Response) {
    const user = request.user!;

    if (user.role !== UserRole.CLIENT) {
      throw new AppError("Acesso permitido apenas para cliente final.", 403);
    }

    const result = await clientPortalService.listAppointments(user.id);

    return response.json(result);
  },
};
