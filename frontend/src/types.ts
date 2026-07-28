export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FollowUp {
  id: number;
  note: string;
  followUpDate: string | null;
  createdAt: string;
  createdBy: { name: string };
}

export interface CustomerDetail extends Customer {
  followUps: FollowUp[];
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: number;
  minStockAlert: number;
  location: string;
}

export type MovementType = "IN" | "OUT";

export interface StockMovement {
  id: number;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdBy: { name: string };
}

export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface ChallanItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
}

export interface Challan {
  id: number;
  challanNumber: string;
  customerId: number;
  customerNameSnapshot: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
  items: ChallanItem[];
  customer?: Customer;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
