import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with this value already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
};
