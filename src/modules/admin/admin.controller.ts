import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { adminService } from "./admin.service";
import {
  listAdminBusinessesQuerySchema,
  listAdminPaymentsQuerySchema,
} from "./admin.validations";

export const adminController = {
  async overview(request: AuthRequest, response: Response) {
    const overview = await adminService.overview();

    return response.json(overview);
  },

  async listBusinesses(request: AuthRequest, response: Response) {
    const filters = listAdminBusinessesQuerySchema.parse(request.query);
    const businesses = await adminService.listBusinesses(filters);

    return response.json(businesses);
  },

  async findBusinessById(request: AuthRequest, response: Response) {
    const business = await adminService.findBusinessById(request.params.id);

    return response.json(business);
  },

  async listApprovals(request: AuthRequest, response: Response) {
    const businesses = await adminService.listApprovals();

    return response.json(businesses);
  },

  async listPayments(request: AuthRequest, response: Response) {
    const filters = listAdminPaymentsQuerySchema.parse(request.query);
    const payments = await adminService.listPayments(filters);

    return response.json(payments);
  },
};
