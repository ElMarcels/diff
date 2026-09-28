"use client";

/**
 * Tiny fetch wrapper for the client components: always JSON, never throws,
 * and surfaces the API's `{ error, fields }` shape to the forms.
 */
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
  status: number;
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: payload?.error ?? "Something went wrong.", fields: payload?.fields };
    }
    return { ok: true, status: res.status, data: payload as T };
  } catch {
    return { ok: false, status: 0, error: "Network error. Check your connection and try again." };
  }
}
