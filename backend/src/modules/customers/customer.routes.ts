import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";
import { getPagination, buildPaginationMeta } from "../../lib/pagination";
import { requireAuth, requireRole } from "../../middleware/auth";
import { customerSchema, updateCustomerSchema, followUpSchema } from "./customer.schema";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const search = (req.query.search as string) || "";
    const status = req.query.status as string | undefined;
    const customerType = req.query.customerType as string | undefined;

    const where = {
      AND: [
        status ? { status: status as any } : {},
        customerType ? { customerType: customerType as any } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { mobile: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                { businessName: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.customer.count({ where }),
    ]);

    res.json({ data, meta: buildPaginationMeta(total, page, limit) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        followUps: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    res.json(customer);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = updateCustomerSchema.parse(req.body);
    const customer = await prisma.customer.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(customer);
  })
);

router.post(
  "/:id/followups",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = followUpSchema.parse(req.body);
    const customerId = Number(req.params.id);

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    const followUp = await prisma.followUp.create({
      data: { ...data, customerId, createdById: req.user!.id },
    });

    if (data.followUpDate) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { followUpDate: data.followUpDate },
      });
    }

    res.status(201).json(followUp);
  })
);

export default router;
