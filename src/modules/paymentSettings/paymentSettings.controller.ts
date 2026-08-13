import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { paymentSettingsService } from "./paymentSettings.service";
import {
  billingCycleParamSchema,
  updatePlatformBillingPlanSchema,
  updatePlatformPaymentOptionSchema,
} from "./paymentSettings.validations";

export const paymentSettingsController = {
  async listAdminOptions(
    request: AuthRequest,
    response: Response
  ) {
    const options =
      await paymentSettingsService.listAdminOptions();

    return response.json(options);
  },

  async getActiveOption(
    request: AuthRequest,
    response: Response
  ) {
    const cycle = billingCycleParamSchema.parse(
      request.params.cycle
    );

    const option =
      await paymentSettingsService.getActiveOption(cycle);

    return response.json({
      option,
    });
  },

  async saveOption(
    request: AuthRequest,
    response: Response
  ) {
    if (!request.user) {
      throw new AppError(
        "Administrador não autenticado.",
        401
      );
    }

    const cycle = billingCycleParamSchema.parse(
      request.params.cycle
    );

    const data =
      updatePlatformPaymentOptionSchema.parse(
        request.body
      );

    const option =
      await paymentSettingsService.saveOption(
        cycle,
        request.user.id,
        data
      );

    return response.json({
      message:
        "Configuração de pagamento salva com sucesso.",
      option,
    });
  },

  async listAdminBillingPlans(
    request: AuthRequest,
    response: Response
  ) {
    const plans =
      await paymentSettingsService.listAdminBillingPlans();

    return response.json(plans);
  },

  async saveBillingPlan(
    request: AuthRequest,
    response: Response
  ) {
    if (!request.user) {
      throw new AppError(
        "Administrador não autenticado.",
        401
      );
    }

    const cycle = billingCycleParamSchema.parse(
      request.params.cycle
    );

    const data =
      updatePlatformBillingPlanSchema.parse(
        request.body
      );

    const plan =
      await paymentSettingsService.saveBillingPlan(
        cycle,
        request.user.id,
        data
      );

    return response.json({
      message:
        "Plano atualizado com sucesso.",
      plan,
    });
  },
};
