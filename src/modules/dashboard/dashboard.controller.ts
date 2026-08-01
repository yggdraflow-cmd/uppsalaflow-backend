import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  async summary(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");
    const date = String(request.query.date || new Date().toISOString());
    const summary = await dashboardService.summary(ownerId, businessId, date);

    return response.json(summary);
  },
};
