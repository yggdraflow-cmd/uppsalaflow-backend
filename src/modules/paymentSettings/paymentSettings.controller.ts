import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { paymentSettingsService } from "./paymentSettings.service";
import {
  billingCycleParamSchema,
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
};
