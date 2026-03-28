import type {
  HealthResponse,
  MaintenanceRequestResponse,
  PresignedUrlResponse,
  InvoiceResponse,
  BudgetResponse,
  PropertyResponse,
  LeaseResponse,
} from "@/types";

// In development the Next.js rewrite in next.config.ts proxies /api/* to the
// backend, so we never expose the backend URL to the browser.
// In production on Vercel this env var points to the EC2 public URL.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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
    credentials: "include", // forwards the session cookie (for Cognito later)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiClientError(res.status, text);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Health ─────────────────────────────────────────────────────────────────

export const healthApi = {
  get: () => request<HealthResponse>("/health"),
};

// ── Properties ─────────────────────────────────────────────────────────────

export const propertiesApi = {
  list: () => request<PropertyResponse[]>("/properties"),
  get: (id: string) => request<PropertyResponse>(`/properties/${id}`),
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

  get: (id: string) => request<MaintenanceRequestResponse>(`/maintenance-requests/${id}`),

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
