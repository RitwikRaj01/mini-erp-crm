import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.number().positive(),
  currentStock: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).default(0),
  location: z.string().min(1),
});

export const updateProductSchema = productSchema
  .omit({ currentStock: true })
  .partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1),
});
