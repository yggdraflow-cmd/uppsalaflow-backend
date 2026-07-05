import { Router } from "express";

import { adminRoutes } from "../modules/admin/admin.routes";
import { appointmentsRoutes } from "../modules/appointments/appointments.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { businessesRoutes } from "../modules/businesses/businesses.routes";
import { clientPortalRoutes } from "../modules/clientPortal/clientPortal.routes";
import { clientsRoutes } from "../modules/clients/clients.routes";
import { dashboardRoutes } from "../modules/dashboard/dashboard.routes";
import { professionalsRoutes } from "../modules/professionals/professionals.routes";
import { publicBookingRoutes } from "../modules/publicBooking/publicBooking.routes";
import { servicesRoutes } from "../modules/services/services.routes";
import { usersRoutes } from "../modules/users/users.routes";

export const routes = Router();

routes.get("/health", (request, response) => {
  return response.json({
    status: "ok",
    app: "Uppsalaflow Backend",
  });
});

routes.use("/public", publicBookingRoutes);

routes.use("/auth", authRoutes);
routes.use("/users", usersRoutes);
routes.use("/businesses", businessesRoutes);
routes.use("/clients", clientsRoutes);
routes.use("/client", clientPortalRoutes);
routes.use("/services", servicesRoutes);
routes.use("/professionals", professionalsRoutes);
routes.use("/appointments", appointmentsRoutes);
routes.use("/dashboard", dashboardRoutes);
routes.use("/admin", adminRoutes);
