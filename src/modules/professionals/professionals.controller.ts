import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { professionalsService } from "./professionals.service";
import {
  createProfessionalSchema,
  updateProfessionalSchema,
} from "./professionals.validations";

export const professionalsController = {
  async create(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = createProfessionalSchema.parse(request.body);
    const professional = await professionalsService.create(ownerId, data);

    return response.status(201).json(professional);
  },

  async list(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const businessId = String(request.query.businessId || "");
    const professionals = await professionalsService.list(ownerId, businessId);

    return response.json(professionals);
  },

  async findById(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const professional = await professionalsService.findById(ownerId, request.params.id);

    return response.json(professional);
  },

  async update(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const data = updateProfessionalSchema.parse(request.body);
    const professional = await professionalsService.update(ownerId, request.params.id, data);

    return response.json(professional);
  },

  async remove(request: AuthRequest, response: Response) {
    const ownerId = request.user!.id;
    const result = await professionalsService.remove(ownerId, request.params.id);

    return response.json(result);
  },
};
