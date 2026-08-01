import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { adminService } from "./admin.service";
import {
  approveBusinessBodySchema,
  listAdminBusinessesQuerySchema,
  listAdminPaymentsQuerySchema,
  requiredBusinessReasonBodySchema,
} from "./admin.validations";

function getAdminContext(request: AuthRequest) {
  if (!request.user) {
    throw new AppError("Administrador não autenticado.", 401);
  }

  return {
    actorId: request.user.id,
    ipAddress: request.ip,
  };
}

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

  async approveBusiness(request: AuthRequest, response: Response) {
    const { actorId, ipAddress } = getAdminContext(request);
    const data = approveBusinessBodySchema.parse(request.body ?? {});

    const business = await adminService.approveBusiness({
      businessId: request.params.id,
      actorId,
      ipAddress,
      reason: data.reason,
    });

    return response.json({
      message: "Empresa aprovada e liberada com sucesso.",
      business,
    });
  },

  async rejectBusiness(request: AuthRequest, response: Response) {
    const { actorId, ipAddress } = getAdminContext(request);
    const data = requiredBusinessReasonBodySchema.parse(request.body);

    const business = await adminService.rejectBusiness({
      businessId: request.params.id,
      actorId,
      ipAddress,
      reason: data.reason,
    });

    return response.json({
      message: "Empresa rejeitada.",
      business,
    });
  },

  async blockBusiness(request: AuthRequest, response: Response) {
    const { actorId, ipAddress } = getAdminContext(request);
    const data = requiredBusinessReasonBodySchema.parse(request.body);

    const business = await adminService.blockBusiness({
      businessId: request.params.id,
      actorId,
      ipAddress,
      reason: data.reason,
    });

    return response.json({
      message: "Empresa bloqueada.",
      business,
    });
  },

  async suspendBusiness(request: AuthRequest, response: Response) {
    const { actorId, ipAddress } = getAdminContext(request);
    const data = requiredBusinessReasonBodySchema.parse(request.body);

    const business = await adminService.suspendBusiness({
      businessId: request.params.id,
      actorId,
      ipAddress,
      reason: data.reason,
    });

    return response.json({
      message: "Empresa suspensa.",
      business,
    });
  },

  async reactivateBusiness(request: AuthRequest, response: Response) {
    const { actorId, ipAddress } = getAdminContext(request);
    const data = approveBusinessBodySchema.parse(request.body ?? {});

    const business = await adminService.reactivateBusiness({
      businessId: request.params.id,
      actorId,
      ipAddress,
      reason: data.reason,
    });

    return response.json({
      message: "Empresa reativada com sucesso.",
      business,
    });
  },
};
