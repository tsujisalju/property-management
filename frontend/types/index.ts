// These types mirror the DTOs in backend/PropertyApi/DTOs/Dtos.cs.
// Keep them in sync when you add new fields.

export type UserRole = "manager" | "tenant" | "maintenance_staff" | "admin";
export type LeaseStatus = "active" | "expired" | "terminated";
export type UnitStatus = "vacant" | "occupied" | "maintenance";
export type RequestStatus = "open" | "in_progress" | "resolved" | "closed";
export type RequestPriority = "low" | "medium" | "high" | "emergency";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";
export type InvoiceType = "rent" | "maintenance" | "deposit" | "penalty";

export interface HealthResponse {
  status: "ok" | "degraded";
  environment: string;
  database: "connected" | "unreachable";
  timestamp: string;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
}

export interface PropertyResponse {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  s3PhotoKey: string | null;
  createdAt: string;
}

export interface PropertyDetailResponse extends PropertyResponse {
  units: UnitResponse[];
}

export interface UnitResponse {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number | null;
  bedrooms: number;
  rentAmount: number;
  status: UnitStatus;
}

export interface LeaseResponse {
  id: string;
  unitId: string;
  unitNumber: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: LeaseStatus;
}

export interface MaintenanceRequestResponse {
  id: string;
  unitId: string;
  unitNumber: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  assignedTo: string | null;
  assigneeName: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: RequestPriority;
  status: RequestStatus;
  s3PhotoKey: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface MaintenanceRequestDetailResponse extends MaintenanceRequestResponse {
  comments: CommentResponse[];
}

export interface CommentResponse {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface InvoiceResponse {
  id: string;
  leaseId: string;
  type: InvoiceType;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: InvoiceStatus;
  s3PdfKey: string | null;
  createdAt: string;
}

export interface CreateInvoiceRequest {
  leaseId: string;
  type: string;
  amount: number;
  dueDate: string;
  category?: string;
}

export interface BudgetResponse {
  id: string;
  propertyId: string;
  year: number;
  month: number;
  category: string;
  allocated: number;
  spent: number;
}

export interface UpsertBudgetRequest {
  propertyId: string;
  year: number;
  month: number;
  category: string;
  allocated: number;
}

export interface RecordSpendRequest {
  propertyId: string;
  year: number;
  month: number;
  category: string;
  amount: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
}

// ── API error shape ────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  status: number;
}
