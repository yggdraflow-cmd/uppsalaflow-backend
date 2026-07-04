import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { appointmentsService } from "./appointments.service";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.validations";

export const appointmentsController = {
  async create(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createAppointmentSchema.parse(request.body);
    const appointment = await appointmentsService.create(ownerId, data);

    return response.status(201).json(appointment);
  },

  async listByDay(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");
    const date = String(request.query.date || "");

    const appointments = await appointmentsService.listByDay(
      ownerId,
      businessId,
      date
    );

    return response.json(appointments);
  },

  async listHistory(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");

    const appointments = await appointmentsService.listHistory(
      ownerId,
      businessId
    );

    return response.json(appointments);
  },

  async updateStatus(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const { status } = updateAppointmentStatusSchema.parse(request.body);

    const appointment = await appointmentsService.updateStatus(
      ownerId,
      request.params.id,
      status
    );

    return response.json(appointment);
  },
};