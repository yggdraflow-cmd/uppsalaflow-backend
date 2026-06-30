import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { businessesService } from "./businesses.service";
import { createBusinessSchema, updateBusinessSchema } from "./businesses.validations";

export const businessesController = {
  async create(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createBusinessSchema.parse(request.body);
    const business = await businessesService.create(ownerId, data);

    return response.status(201).json(business);
  },

  async list(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businesses = await businessesService.list(ownerId);

    return response.json(businesses);
  },

  async findById(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const business = await businessesService.findById(ownerId, request.params.id);

    return response.json(business);
  },

  async update(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = updateBusinessSchema.parse(request.body);
    const business = await businessesService.update(ownerId, request.params.id, data);

    return response.json(business);
  },

  async remove(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const result = await businessesService.remove(ownerId, request.params.id);

    return response.json(result);
  },
};
