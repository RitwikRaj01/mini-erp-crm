import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

export default router;
