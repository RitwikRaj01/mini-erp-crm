import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email(),
  businessName: z.string().min(1),
  gstNumber: z.string().optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().min(1),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = customerSchema.partial();

export const followUpSchema = z.object({
  note: z.string().min(1),
  followUpDate: z.coerce.date().optional(),
});
