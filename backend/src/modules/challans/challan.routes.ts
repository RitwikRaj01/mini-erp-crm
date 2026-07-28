import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../lib/asyncHandler";
import { getPagination, buildPaginationMeta } from "../../lib/pagination";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createChallanSchema, updateChallanSchema } from "./challan.schema";

const router = Router();

router.use(requireAuth);

const generateChallanNumber = (id: number) => `CH-${String(id).padStart(6, "0")}`;

async function assertSufficientStock(
  tx: Prisma.TransactionClient,
  items: { productId: number; quantity: number }[]
) {
  const products = await tx.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const shortages: string[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError(404, `Product ${item.productId} not found`);
    }
    if (product.currentStock < item.quantity) {
      shortages.push(`${product.name} (available: ${product.currentStock}, requested: ${item.quantity})`);
    }
  }

  if (shortages.length > 0) {
    throw new AppError(400, `Insufficient stock for: ${shortages.join(", ")}`);
  }
}

async function reduceStockForItems(
  tx: Prisma.TransactionClient,
  items: { productId: number; quantity: number }[],
  reason: string,
  createdById: number
) {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { decrement: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        movementType: "OUT",
        reason,
        createdById,
      },
    });
  }
}

async function restoreStockForItems(
  tx: Prisma.TransactionClient,
  items: { productId: number; quantity: number }[],
  reason: string,
  createdById: number
) {
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        movementType: "IN",
        reason,
        createdById,
      },
    });
  }
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as any } : {};

    const [data, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { customer: true, items: true },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({ data, meta: buildPaginationMeta(total, page, limit) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!challan) {
      throw new AppError(404, "Challan not found");
    }

    res.json(challan);
  })
);

router.post(
  "/",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const { customerId, items, status } = createChallanSchema.parse(req.body);
    const createdById = req.user!.id;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError(404, "Customer not found");
    }

    const challan = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      if (status === "CONFIRMED") {
        await assertSufficientStock(tx, items);
      }

      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

      const created = await tx.challan.create({
        data: {
          challanNumber: "PENDING",
          customerId,
          customerNameSnapshot: customer.name,
          status,
          totalQuantity,
          createdById,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) {
                throw new AppError(404, `Product ${item.productId} not found`);
              }
              return {
                productId: item.productId,
                productName: product.name,
                sku: product.sku,
                unitPrice: product.unitPrice,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { items: true, customer: true },
      });

      const challanNumber = generateChallanNumber(created.id);
      const updated = await tx.challan.update({
        where: { id: created.id },
        data: { challanNumber },
        include: { items: true, customer: true },
      });

      if (status === "CONFIRMED") {
        await reduceStockForItems(tx, items, `Sales Challan ${challanNumber}`, createdById);
      }

      return updated;
    });

    res.status(201).json(challan);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const data = updateChallanSchema.parse(req.body);
    const challanId = Number(req.params.id);

    const challan = await prisma.challan.findUnique({ where: { id: challanId } });
    if (!challan) {
      throw new AppError(404, "Challan not found");
    }
    if (challan.status !== "DRAFT") {
      throw new AppError(400, "Only draft challans can be edited");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) {
          throw new AppError(404, "Customer not found");
        }
      }

      if (data.items) {
        const products = await tx.product.findMany({
          where: { id: { in: data.items.map((i) => i.productId) } },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        await tx.challanItem.deleteMany({ where: { challanId } });

        for (const item of data.items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new AppError(404, `Product ${item.productId} not found`);
          }
          await tx.challanItem.create({
            data: {
              challanId,
              productId: item.productId,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              quantity: item.quantity,
            },
          });
        }
      }

      return tx.challan.update({
        where: { id: challanId },
        data: {
          customerId: data.customerId,
          totalQuantity: data.items ? data.items.reduce((sum, i) => sum + i.quantity, 0) : undefined,
        },
        include: { items: true, customer: true },
      });
    });

    res.json(updated);
  })
);

router.post(
  "/:id/confirm",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challanId = Number(req.params.id);

    const challan = await prisma.challan.findUnique({
      where: { id: challanId },
      include: { items: true },
    });

    if (!challan) {
      throw new AppError(404, "Challan not found");
    }
    if (challan.status !== "DRAFT") {
      throw new AppError(400, "Only draft challans can be confirmed");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await assertSufficientStock(tx, challan.items);
      await reduceStockForItems(
        tx,
        challan.items,
        `Sales Challan ${challan.challanNumber}`,
        req.user!.id
      );

      return tx.challan.update({
        where: { id: challanId },
        data: { status: "CONFIRMED" },
        include: { items: true, customer: true },
      });
    });

    res.json(updated);
  })
);

router.post(
  "/:id/cancel",
  requireRole("ADMIN", "SALES"),
  asyncHandler(async (req, res) => {
    const challanId = Number(req.params.id);

    const challan = await prisma.challan.findUnique({
      where: { id: challanId },
      include: { items: true },
    });

    if (!challan) {
      throw new AppError(404, "Challan not found");
    }
    if (challan.status === "CANCELLED") {
      throw new AppError(400, "Challan is already cancelled");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (challan.status === "CONFIRMED") {
        await restoreStockForItems(
          tx,
          challan.items,
          `Challan ${challan.challanNumber} cancelled`,
          req.user!.id
        );
      }

      return tx.challan.update({
        where: { id: challanId },
        data: { status: "CANCELLED" },
        include: { items: true, customer: true },
      });
    });

    res.json(updated);
  })
);

export default router;
