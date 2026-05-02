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

// Server-side: use BACKEND_URL to reach the backend directly (relative URLs
// are invalid in server-side fetch). Falls back to localhost for local dev.
// Client-side: always use "" so /api/* goes through the Next.js rewrite in
// next.config.ts — the rewrite proxies server-to-server, keeping HTTP off the
// browser and avoiding mixed-content errors on the Vercel HTTPS deployment.
const BASE =
  typeof window === "undefined"
    ? (process.env.BACKEND_URL ?? "http://localhost:8080")
    : "";

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
        credentials: "include", 
    });

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new ApiClientError(res.status, text);
    }

    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
}

// ── Users

export const usersApi = {
  me: () => request<UserResponse>("/users/me"),
  updateMe: (body: { fullName?: string; phone?: string }) =>
    request<UserResponse>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  list: (params?: { role?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v))
    ).toString();
    return request<UserResponse[]>(`/users${qs ? `?${qs}` : ""}`);
  },
};

// ── Health

export const healthApi = {
    get: () => request<HealthResponse>("/health"),
};

// ── Properties 

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

// ── Leases 
export const leasesApi = {
  list: (unitId?: string) =>
    request<LeaseResponse[]>(`/leases${unitId ? `?unitId=${unitId}` : ""}`),

  get: (id: string) =>
    request<LeaseResponse>(`/leases/${id}`),

  create: (body: {
    unitId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
  }) =>
    request<LeaseResponse>("/leases", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  terminate: (id: string) =>
    request<void>(`/leases/${id}/terminate`, {
      method: "PATCH",
    }),
};

// ── Maintenance requests 

export const maintenanceApi = {
  list: (params?: { status?: string; unitId?: string; assignedTo?: string }) => {
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
    body: { status?: string; assignedTo?: string; priority?: string; clearAssignee?: boolean }
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

  delete: (id: string) =>
    request<void>(`/maintenance-requests/${id}`, {
      method: "DELETE",
    }),

  tenantUpdate: (
    id: string,
    body: {
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
      s3PhotoKey?: string;
    }
  ) =>
    request<void>(`/maintenance-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ── Invoices 

export const invoicesApi = {
    list: (params?: { leaseId?: string; status?: string }) => {
        const qs = new URLSearchParams();
        if (params?.leaseId) qs.set("leaseId", params.leaseId);
        if (params?.status) qs.set("status", params.status);
        const query = qs.size ? `?${qs}` : "";
        return request<InvoiceResponse[]>(`/invoices${query}`);
    },

    getById: (id: string) =>
        request<InvoiceResponse>(`/invoices/${id}`),

    create: (body: {
        leaseId: string;
        type: string;
        amount: number;
        dueDate: string; 
    }) =>
        request<InvoiceResponse>("/invoices", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    markPaid: (id: string) =>
        request<InvoiceResponse>(`/invoices/${id}/mark-paid`, {
            method: "PATCH",
        }),

   
    getPdfUrl: (id: string) =>
        request<{ url: string }>(`/invoices/${id}/pdf-url`),
};

// ── Budgets 

export const budgetsApi = {
    list: (params?: { propertyId?: string; year?: number; month?: number }) => {
        const qs = new URLSearchParams();
        if (params?.propertyId) qs.set("propertyId", params.propertyId);
        if (params?.year) qs.set("year", String(params.year));
        if (params?.month) qs.set("month", String(params.month));
        const query = qs.size ? `?${qs}` : "";
        return request<BudgetResponse[]>(`/budgets${query}`);
    },

    upsert: (propertyId: string, body: {
        year: number;
        month: number;
        category: string;
        allocated: number;
    }) =>
        request<BudgetResponse>(`/budgets?propertyId=${propertyId}`, {
            method: "PUT",
            body: JSON.stringify(body),
        }),

    recordSpend: (body: {
        propertyId: string;
        year: number;
        month: number;
        category: string;
        amount: number;
    }) =>
        request<void>("/budgets/record-spend", {
            method: "POST",
            body: JSON.stringify(body),
        }),
};

// ── S3 direct upload helper ────────────────────────────────────────────────
// Usage: first call maintenanceApi.getPhotoUploadUrl(), then pass the result here.

export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
  contentType?: string
): Promise<void> {
  const normalizedType = contentType?.trim() || file.type?.trim() || "image/jpeg";
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": normalizedType },
    body: file,
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `S3 upload failed (${res.status} ${res.statusText}). ${errorBody}`.trim()
    );
  }
}
