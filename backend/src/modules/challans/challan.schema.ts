import { z } from "zod";

export const challanItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});

export const createChallanSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(challanItemSchema).min(1),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("DRAFT"),
});

export const updateChallanSchema = z.object({
  customerId: z.number().int().positive().optional(),
  items: z.array(challanItemSchema).min(1).optional(),
});
