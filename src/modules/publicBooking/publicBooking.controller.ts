import { Request, Response } from "express";

import { PublicBookingService } from "./publicBooking.service";

const publicBookingService = new PublicBookingService();

export class PublicBookingController {
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