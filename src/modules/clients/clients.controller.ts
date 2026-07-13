import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { clientsService } from "./clients.service";
import { updateClientSchema } from "./clients.validations";

export const clientsController = {
  async list(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");
    const clients = await clientsService.list(ownerId, businessId);

    return response.json(clients);
  },

  async findById(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const client = await clientsService.findById(ownerId, request.params.id);

    return response.json(client);
  },

  async update(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = updateClientSchema.parse(request.body);
    const client = await clientsService.update(ownerId, request.params.id, data);

    return response.json(client);
  },
};
