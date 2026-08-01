import { Router } from "express";

import { PublicBookingController } from "./publicBooking.controller";

const publicBookingRoutes = Router();
const publicBookingController = new PublicBookingController();

publicBookingRoutes.get(
  "/businesses/:slug/booked-times",
  publicBookingController.getBookedTimes
);

publicBookingRoutes.get(
  "/businesses/:slug",
  publicBookingController.getBusinessBySlug
);

publicBookingRoutes.post(
  "/businesses/:slug/appointments",
  publicBookingController.createAppointment
);

export { publicBookingRoutes };