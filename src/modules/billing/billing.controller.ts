import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { billingService } from "./billing.service";
import { selectPlanSchema } from "./billing.validations";

export const billingController = {
  async listPlans(request: AuthRequest, response: Response) {
    return response.json(billingService.listPlans());
  },

  async selectPlan(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = selectPlanSchema.parse(request.body);

    const result = await billingService.selectPlan(
      ownerId,
      data.businessId,
      data.cycle
    );

    return response.status(201).json(result);
  },

  async getStatus(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;

    const result = await billingService.getStatus(
      ownerId,
      request.params.businessId
    );

    return response.json(result);
  },

  async confirmPayment(request: AuthRequest, response: Response) {
    if (!request.user) {
      throw new AppError("Administrador não autenticado.", 401);
    }

    const payment = await billingService.confirmPayment(
      request.user.id,
      request.params.paymentId,
      request.ip
    );

    return response.json({
      message: "Pagamento confirmado com sucesso.",
      payment,
    });
  },
};
