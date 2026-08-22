import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorMiddleware(
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];

    return response.status(400).json({
      message:
        firstIssue?.message ||
        "Os dados enviados são inválidos.",
      field: firstIssue?.path.join(".") || null,
      issues: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return response.status(400).json({
        message: "A imagem excede o limite máximo de 5 MB.",
      });
    }

    return response.status(400).json({
      message: "Não foi possível processar a imagem enviada.",
    });
  }

  console.error(error);

  return response.status(500).json({
    message: "Erro interno no servidor.",
  });
}
