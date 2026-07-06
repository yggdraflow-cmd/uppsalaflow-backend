import { Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { appointmentsService } from "./appointments.service";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./appointments.validations";
import {
  createAppointmentMessageSchema,
  createAppointmentProposalSchema,
} from "./appointments.proposals.validations";

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

  async listPending(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");

    const appointments = await appointmentsService.listPending(
      ownerId,
      businessId
    );

    return response.json(appointments);
  },

  async getThread(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;

    const appointment = await appointmentsService.getThread(
      ownerId,
      request.params.id
    );

    return response.json(appointment);
  },

  async createProposal(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createAppointmentProposalSchema.parse(request.body);

    const appointment = await appointmentsService.createProposal(
      ownerId,
      request.params.id,
      data
    );

    return response.status(201).json(appointment);
  },

  async createMessage(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createAppointmentMessageSchema.parse(request.body);

    const appointment = await appointmentsService.createMessage(
      ownerId,
      request.params.id,
      data.message
    );

    return response.status(201).json(appointment);
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
