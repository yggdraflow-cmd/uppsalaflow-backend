import { Response } from "express";
import { UserRole } from "@prisma/client";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { clientPortalService } from "./clientPortal.service";
import {
  createClientAppointmentMessageSchema,
  respondAppointmentProposalSchema,
} from "./clientPortal.validations";

export const clientPortalController = {
  async listAppointments(request: AuthRequest, response: Response) {
    const user = request.user!;

    if (user.role !== UserRole.CLIENT) {
      throw new AppError("Acesso permitido apenas para cliente final.", 403);
    }

    const result = await clientPortalService.listAppointments(user.id);

    return response.json(result);
  },

  async respondProposal(request: AuthRequest, response: Response) {
    const user = request.user!;

    if (user.role !== UserRole.CLIENT) {
      throw new AppError("Acesso permitido apenas para cliente final.", 403);
    }

    const data = respondAppointmentProposalSchema.parse(request.body);

    const result = await clientPortalService.respondProposal({
      userId: user.id,
      appointmentId: request.params.appointmentId,
      proposalId: request.params.proposalId,
      status: data.status,
      message: data.message,
    });

    return response.json(result);
  },

  async createMessage(request: AuthRequest, response: Response) {
    const user = request.user!;

    if (user.role !== UserRole.CLIENT) {
      throw new AppError("Acesso permitido apenas para cliente final.", 403);
    }

    const data = createClientAppointmentMessageSchema.parse(request.body);

    const result = await clientPortalService.createMessage({
      userId: user.id,
      appointmentId: request.params.appointmentId,
      message: data.message,
    });

    return response.status(201).json(result);
  },
};
