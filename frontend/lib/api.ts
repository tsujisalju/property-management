import type {
  HealthResponse,
  MaintenanceRequestResponse,
  MaintenanceRequestDetailResponse,
  PresignedUrlResponse,
  InvoiceResponse,
  BudgetResponse,
  PropertyResponse,
  PropertyDetailResponse,
  UnitResponse,
  LeaseResponse,
  UserResponse,
} from "@/types";

// Server-side: use BACKEND_URL (internal Docker/network address) to call the
// backend directly — relative URLs are not valid in server-side fetch.
// Client-side: use NEXT_PUBLIC_API_URL if set (production EC2 URL), otherwise
// "" so the Next.js rewrite in next.config.ts proxies /api/* to the backend.
const BASE =
  typeof window === "undefined"
    ? (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
    : (process.env.NEXT_PUBLIC_API_URL ?? "");

class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include", // sends the auth_token cookie automatically
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiClientError(res.status, text);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Users ──────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => request<UserResponse>("/users/me"),
  updateMe: (body: { fullName?: string; phone?: string }) =>
    request<UserResponse>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Health ─────────────────────────────────────────────────────────────────

export const healthApi = {
  get: () => request<HealthResponse>("/health"),
};

// ── Properties ─────────────────────────────────────────────────────────────

export const propertiesApi = {
  list: () => request<PropertyResponse[]>("/properties"),
  get: (id: string) => request<PropertyDetailResponse>(`/properties/${id}`),
  create: (body: { name: string; address: string; city: string; totalUnits: number }) =>
    request<PropertyResponse>("/properties", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; address?: string; city?: string; totalUnits?: number; s3PhotoKey?: string }) =>
    request<PropertyResponse>(`/properties/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getPhotoUploadUrl: (id: string, contentType = "image/jpeg") =>
    request<PresignedUrlResponse>(`/properties/${id}/photo-upload-url?contentType=${encodeURIComponent(contentType)}`, { method: "POST" }),
  getPhotoUrl: (id: string) =>
    request<{ url: string }>(`/properties/${id}/photo-url`),
  getUnits: (propertyId: string) => request<UnitResponse[]>(`/properties/${propertyId}/units`),
  createUnit: (
    propertyId: string,
    body: { unitNumber: string; floor?: number | null; bedrooms: number; rentAmount: number }
  ) =>
    request<UnitResponse>(`/properties/${propertyId}/units`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Leases ─────────────────────────────────────────────────────────────────

export const leasesApi = {
  list: (unitId?: string) =>
    request<LeaseResponse[]>(`/leases${unitId ? `?unitId=${unitId}` : ""}`),
};

// ── Maintenance requests ────────────────────────────────────────────────────

export const maintenanceApi = {
  list: (params?: { status?: string; unitId?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    ).toString();
    return request<MaintenanceRequestResponse[]>(`/maintenance-requests${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => request<MaintenanceRequestDetailResponse>(`/maintenance-requests/${id}`),

  getPhotoUrl: (id: string) =>
    request<{ url: string }>(`/maintenance-requests/${id}/photo-url`),

  create: (body: {
    unitId: string;
    title: string;
    description?: string;
    category: string;
    priority: string;
  }) => request<string>("/maintenance-requests", { method: "POST", body: JSON.stringify(body) }),

  update: (
    id: string,
    body: { status?: string; assignedTo?: string; priority?: string }
  ) =>
    request<void>(`/maintenance-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  addComment: (id: string, body: string) =>
    request<string>(`/maintenance-requests/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  getPhotoUploadUrl: (id: string, contentType = "image/jpeg") =>
    request<PresignedUrlResponse>(
      `/maintenance-requests/${id}/photo-upload-url?contentType=${encodeURIComponent(contentType)}`,
      { method: "POST" }
    ),
};

// ── Invoices ───────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (leaseId?: string) =>
    request<InvoiceResponse[]>(`/invoices${leaseId ? `?leaseId=${leaseId}` : ""}`),
};

// ── Budgets ────────────────────────────────────────────────────────────────

export const budgetsApi = {
  list: (propertyId: string, year: number, month: number) =>
    request<BudgetResponse[]>(`/budgets?propertyId=${propertyId}&year=${year}&month=${month}`),
};

// ── S3 direct upload helper ────────────────────────────────────────────────
// Usage: first call maintenanceApi.getPhotoUploadUrl(), then pass the result here.

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.statusText}`);
}
