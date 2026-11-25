"use client";
// Small fetch helper for the client pages.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Json,
  ) {
    super(message);
  }
}

/** Pull the first useful message out of a zod `flattenError` payload. */
function detailMessage(details: Json): string | null {
  if (!details || typeof details !== "object") return null;
  const form: string[] = details.formErrors ?? [];
  if (form.length) return form[0];
  const fields: Record<string, string[]> = details.fieldErrors ?? {};
  for (const [k, v] of Object.entries(fields)) if (v?.length) return `${k}: ${v[0]}`;
  return null;
}

export async function api(path: string, method = "GET", body?: unknown): Promise<Json> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) {
    // Full reload on purpose: drops all client state of the expired session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new ApiError(401, "Not authenticated");
  }
  if (!res.ok) {
    const base = data?.error ?? "Request failed";
    const extra = detailMessage(data?.details);
    throw new ApiError(res.status, extra && base === "Validation failed" ? extra : base, data?.details);
  }
  return data;
}

/** Turn a <form> into a plain object; empty strings dropped, numeric-looking ids converted. */
export function formData(form: HTMLFormElement) {
  const out: Record<string, string | number> = {};
  new FormData(form).forEach((v, k) => {
    const s = String(v).trim();
    if (s === "") return;
    out[k] = /Id$/.test(k) && /^\d+$/.test(s) ? Number(s) : s;
  });
  return out;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** Build a query string, skipping empty values. */
export function qs(params: Record<string, string | number | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  return p.toString();
}
