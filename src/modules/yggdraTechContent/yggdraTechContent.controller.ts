import { Request, Response } from "express";

import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { getUploadedImageUrl } from "../../middlewares/upload.middleware";
import { yggdraTechContentService } from "./yggdraTechContent.service";
import {
  updateYggdraTechAboutBodySchema,
  updateYggdraTechServicesBodySchema,
} from "./yggdraTechContent.validations";

export const yggdraTechContentController = {
  async getAdminAbout(
    request: AuthRequest,
    response: Response
  ) {
    const content =
      await yggdraTechContentService.getAdminAbout();

    return response.json(content);
  },

  async updateAbout(
    request: AuthRequest,
    response: Response
  ) {
    if (!request.user) {
      throw new AppError(
        "Administrador não autenticado.",
        401
      );
    }

    const data =
      updateYggdraTechAboutBodySchema.parse(
        request.body
      );

    const content =
      await yggdraTechContentService.updateAbout(
        request.user.id,
        data
      );

    return response.json({
      message: "Quem Somos atualizado com sucesso.",
      content,
    });
  },

  async uploadMemberImage(
    request: AuthRequest,
    response: Response
  ) {
    const file = request.file;

    if (!file) {
      throw new AppError("Imagem não enviada.", 400);
    }

    const imageUrl = getUploadedImageUrl(
      "yggdratech-about",
      file
    );

    return response.status(201).json({
      imageUrl,
    });
  },

  async getPublicAbout(
    request: Request,
    response: Response
  ) {
    const content =
      await yggdraTechContentService.getPublicAbout();

    return response.json(content);
  },

  async getAdminServices(
    request: AuthRequest,
    response: Response
  ) {
    const content =
      await yggdraTechContentService.getAdminServices();

    return response.json(content);
  },

  async updateServices(
    request: AuthRequest,
    response: Response
  ) {
    if (!request.user) {
      throw new AppError(
        "Administrador não autenticado.",
        401
      );
    }

    const data =
      updateYggdraTechServicesBodySchema.parse(
        request.body
      );

    const content =
      await yggdraTechContentService.updateServices(
        request.user.id,
        data
      );

    return response.json({
      message: "Serviços atualizado com sucesso.",
      content,
    });
  },

  async uploadServiceImage(
    request: AuthRequest,
    response: Response
  ) {
    const file = request.file;

    if (!file) {
      throw new AppError("Imagem não enviada.", 400);
    }

    const imageUrl = getUploadedImageUrl(
      "yggdratech-services",
      file
    );

    return response.status(201).json({
      imageUrl,
    });
  },

  async getPublicServices(
    request: Request,
    response: Response
  ) {
    const content =
      await yggdraTechContentService.getPublicServices();

    return response.json(content);
  },
};
