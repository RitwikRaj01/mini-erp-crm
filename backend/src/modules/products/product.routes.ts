import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";
import { getPagination, buildPaginationMeta } from "../../lib/pagination";
import { requireAuth, requireRole } from "../../middleware/auth";
import { productSchema, updateProductSchema, stockMovementSchema } from "./product.schema";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const search = (req.query.search as string) || "";
    const category = req.query.category as string | undefined;
    const lowStock = req.query.lowStock === "true";

    const where: any = {
      AND: [
        category ? { category } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { sku: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
      ],
    };

    const [allMatching, total] = await Promise.all([
      lowStock ? prisma.product.findMany({ where }) : Promise.resolve(null),
      prisma.product.count({ where }),
    ]);

    const data = lowStock
      ? allMatching!
          .filter((p) => p.currentStock <= p.minStockAlert)
          .slice(skip, skip + limit)
      : await prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } });

    res.json({ data, meta: buildPaginationMeta(total, page, limit) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) {
      throw new AppError(404, "Product not found");
    }
    res.json(product);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const data = updateProductSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(product);
  })
);

router.get(
  "/:id/stock-movements",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const productId = Number(req.params.id);

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    res.json({ data, meta: buildPaginationMeta(total, page, limit) });
  })
);

router.post(
  "/:id/stock-movements",
  requireRole("ADMIN", "WAREHOUSE"),
  asyncHandler(async (req, res) => {
    const { quantity, movementType, reason } = stockMovementSchema.parse(req.body);
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new AppError(404, "Product not found");
    }

    if (movementType === "OUT" && product.currentStock < quantity) {
      throw new AppError(400, "Insufficient stock for this movement");
    }

    const stockDelta = movementType === "IN" ? quantity : -quantity;

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { productId, quantity, movementType, reason, createdById: req.user!.id },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: { increment: stockDelta } },
      }),
    ]);

    res.status(201).json(movement);
  })
);

export default router;
