import { Router } from "express";

import { authMiddleware } from "../../middlewares/auth.middleware";
import { clientPortalController } from "./clientPortal.controller";

export const clientPortalRoutes = Router();

clientPortalRoutes.get(
  "/appointments",
  authMiddleware,
  clientPortalController.listAppointments
);

clientPortalRoutes.patch(
  "/appointments/:appointmentId/proposals/:proposalId/respond",
  authMiddleware,
  clientPortalController.respondProposal
);

clientPortalRoutes.post(
  "/appointments/:appointmentId/review",
  authMiddleware,
  clientPortalController.createReview
);

clientPortalRoutes.post(
  "/appointments/:appointmentId/messages",
  authMiddleware,
  clientPortalController.createMessage
);
