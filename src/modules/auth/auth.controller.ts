import { Request, Response } from "express";

import { authService } from "./auth.service";
import {
  clientRegisterSchema,
  loginSchema,
  registerSchema,
} from "./auth.validations";

export const authController = {
  async register(request: Request, response: Response) {
    const data = registerSchema.parse(request.body);
    const result = await authService.register(data);

    return response.status(201).json(result);
  },

  async registerClient(request: Request, response: Response) {
    const data = clientRegisterSchema.parse(request.body);
    const result = await authService.registerClient(data);

    return response.status(201).json(result);
  },

  async login(request: Request, response: Response) {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(data, "BUSINESS");

    return response.json(result);
  },

  async loginClient(request: Request, response: Response) {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(data, "CLIENT");

    return response.json(result);
  },
};
