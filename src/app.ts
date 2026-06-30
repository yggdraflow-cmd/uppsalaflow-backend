import "express-async-errors";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { routes } from "./routes";
import { AppError, errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

app.use((error: Error, request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Erro de validação.",
      errors: error.flatten().fieldErrors,
    });
  }

  return errorMiddleware(error, request, response, next);
});
