import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import multer from "multer";

import { AppError } from "./error.middleware";

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function createImageUpload(folderName: string) {
  const destination = resolve("uploads", folderName);

  mkdirSync(destination, {
    recursive: true,
  });

  return multer({
    storage: multer.diskStorage({
      destination: (_request, _file, callback) => {
        callback(null, destination);
      },
      filename: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase() || ".jpg";
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: {
      fileSize: MAX_IMAGE_SIZE_IN_BYTES,
    },
    fileFilter: (_request, file, callback) => {
      if (!allowedImageMimeTypes.has(file.mimetype)) {
        callback(
          new AppError(
            "Formato não suportado. Use uma imagem JPG, PNG ou WEBP.",
            400
          )
        );
        return;
      }

      callback(null, true);
    },
  });
}

export const profileImageUpload = createImageUpload("profile-images");
export const businessLogoUpload = createImageUpload("business-logos");
export const businessCoverUpload = createImageUpload("business-covers");
export const yggdraTechAboutImageUpload = createImageUpload(
  "yggdratech-about"
);
export const yggdraTechServiceImageUpload = createImageUpload(
  "yggdratech-services"
);

export function getUploadedImageUrl(
  folderName: string,
  file: Express.Multer.File
) {
  return `/uploads/${folderName}/${file.filename}`;
}
