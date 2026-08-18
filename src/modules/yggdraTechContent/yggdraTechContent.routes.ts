import { Router } from "express";

import { yggdraTechContentController } from "./yggdraTechContent.controller";

export const yggdraTechPublicRoutes = Router();

yggdraTechPublicRoutes.get(
  "/about",
  yggdraTechContentController.getPublicAbout
);

yggdraTechPublicRoutes.get(
  "/services",
  yggdraTechContentController.getPublicServices
);
