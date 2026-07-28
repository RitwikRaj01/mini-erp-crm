import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { AppError } from "../lib/errors";

export interface AuthUser {
  id: number;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
    next();
  };
};
