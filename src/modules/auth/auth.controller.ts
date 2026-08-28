import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { authService } from "./auth.service";
import {
  adminTwoFactorLoginSchema,
  clientRegisterSchema,
  emailVerificationSchema,
  loginSchema,
  registerSchema,
  twoFactorCodeSchema,
} from "./auth.validations";

function getAuthenticatedUserId(request: AuthRequest) {
  if (!request.user) {
    throw new AppError("Usuário não autenticado.", 401);
  }

  return request.user.id;
}

export const authController = {
  async register(request: AuthRequest, response: Response) {
    const data = registerSchema.parse(request.body);
    const result = await authService.register(data);

    return response.status(201).json(result);
  },

  async registerClient(
    request: AuthRequest,
    response: Response
  ) {
    const data = clientRegisterSchema.parse(request.body);
    const result = await authService.registerClient(data);

    return response.status(201).json(result);
  },

  async verifyEmail(
    request: AuthRequest,
    response: Response
  ) {
    const { token } = emailVerificationSchema.parse(
      request.body
    );

    const result = await authService.verifyEmail(token);

    return response.json(result);
  },

  async login(request: AuthRequest, response: Response) {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(
      data,
      "BUSINESS"
    );

    return response.json(result);
  },

  async loginClient(
    request: AuthRequest,
    response: Response
  ) {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(
      data,
      "CLIENT"
    );

    return response.json(result);
  },

  async loginAdmin(
    request: AuthRequest,
    response: Response
  ) {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(
      data,
      "ADMIN"
    );

    return response.json(result);
  },

  async verifyAdminTwoFactorLogin(
    request: AuthRequest,
    response: Response
  ) {
    const { challengeToken, code } =
      adminTwoFactorLoginSchema.parse(request.body);

    const result =
      await authService.verifyAdminTwoFactorLogin(
        challengeToken,
        code
      );

    return response.json(result);
  },

  async setupAdminTwoFactor(
    request: AuthRequest,
    response: Response
  ) {
    const userId = getAuthenticatedUserId(request);

    const result =
      await authService.setupAdminTwoFactor(userId);

    return response.json(result);
  },

  async confirmAdminTwoFactor(
    request: AuthRequest,
    response: Response
  ) {
    const userId = getAuthenticatedUserId(request);
    const { code } = twoFactorCodeSchema.parse(
      request.body
    );

    const result =
      await authService.confirmAdminTwoFactor(
        userId,
        code
      );

    return response.json({
      message:
        "Autenticação em dois fatores ativada com sucesso.",
      ...result,
    });
  },
};
