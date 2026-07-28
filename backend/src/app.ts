import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import productRoutes from "./modules/products/product.routes";
import challanRoutes from "./modules/challans/challan.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/challans", challanRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
