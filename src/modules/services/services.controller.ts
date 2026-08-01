import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { servicesService } from "./services.service";
import { createServiceSchema, updateServiceSchema } from "./services.validations";

export const servicesController = {
  async create(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createServiceSchema.parse(request.body);
    const service = await servicesService.create(ownerId, data);

    return response.status(201).json(service);
  },

  async list(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");
    const services = await servicesService.list(ownerId, businessId);

    return response.json(services);
  },

  async findById(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const service = await servicesService.findById(ownerId, request.params.id);

    return response.json(service);
  },

  async update(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = updateServiceSchema.parse(request.body);
    const service = await servicesService.update(ownerId, request.params.id, data);

    return response.json(service);
  },

  async remove(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const result = await servicesService.remove(ownerId, request.params.id);

    return response.json(result);
  },
};
