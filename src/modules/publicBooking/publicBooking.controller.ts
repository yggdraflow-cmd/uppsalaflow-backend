import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";

import { env } from "../../config/env";
import { PublicBookingService } from "./publicBooking.service";

type JwtPayload = {
  role?: UserRole;
  sub?: string;
};

const publicBookingService = new PublicBookingService();

function getClientUserIdFromRequest(request: Request) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

    if (decoded.role === UserRole.CLIENT && typeof decoded.sub === "string") {
      return decoded.sub;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export class PublicBookingController {
  async listBusinesses(request: Request, response: Response) {
    try {
      const businesses = await publicBookingService.listBusinesses();

      return response.json(businesses);
    } catch {
      return response.status(500).json({
        message: "Não foi possível carregar os estabelecimentos.",
      });
    }
  }

  async getBusinessBySlug(request: Request, response: Response) {
    try {
      const { slug } = request.params;

      const business = await publicBookingService.getBusinessBySlug(slug);

      if (!business) {
        return response.status(404).json({
          message: "Negócio não encontrado.",
        });
      }

      return response.json(business);
    } catch {
      return response.status(500).json({
        message: "Não foi possível carregar a página pública do negócio.",
      });
    }
  }

  async getBookedTimes(request: Request, response: Response) {
    try {
      const { slug } = request.params;
      const { date, professionalId } = request.query;

      const bookedTimes = await publicBookingService.getBookedTimes({
        slug,
        date: String(date || ""),
        professionalId: String(professionalId || ""),
      });

      return response.json(bookedTimes);
    } catch (error) {
      if (error instanceof Error) {
        return response.status(400).json({
          message: error.message,
        });
      }

      return response.status(500).json({
        message: "Não foi possível carregar os horários ocupados.",
      });
    }
  }

  async createAppointment(request: Request, response: Response) {
    try {
      const { slug } = request.params;

      const appointment = await publicBookingService.createAppointment({
        slug,
        clientUserId: getClientUserIdFromRequest(request),
        clientName: request.body.clientName,
        clientPhone: request.body.clientPhone,
        clientEmail: request.body.clientEmail,
        serviceId: request.body.serviceId,
        professionalId: request.body.professionalId,
        date: request.body.date,
        startTime: request.body.startTime,
        notes: request.body.notes,
      });

      return response.status(201).json(appointment);
    } catch (error) {
      if (error instanceof Error) {
        return response.status(400).json({
          message: error.message,
        });
      }

      return response.status(500).json({
        message: "Não foi possível criar o agendamento.",
      });
    }
  }
}
