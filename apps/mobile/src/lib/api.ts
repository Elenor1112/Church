import { API_URL } from "./config";

let tokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApi(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  tokenGetter = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * Hard cap on every request. Without this, a fetch to an unreachable API
 * (wrong LAN IP, server down, firewall) hangs indefinitely — which surfaces as
 * a spinner that never resolves. We'd rather fail fast with a clear message.
 */
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenGetter();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const sentToken = auth && headers["Authorization"] !== undefined;

  // Abort the request if it neither resolves nor rejects within the timeout.
  // If the caller passed their own signal, honour it too.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) timeoutController.abort();
    else signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutController.signal,
    });
  } catch {
    const timedOut = timeoutController.signal.aborted && !signal?.aborted;
    throw new ApiError(
      0,
      timedOut
        ? `Couldn't reach the server at ${API_URL}. Check that the API is running and reachable.`
        : "Network error — check your connection",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  // A successful response that isn't JSON means we're talking to something that
  // is not this API — most often API_URL points at the Expo web build, which
  // answers every path with its HTML index at 200. Without this guard the HTML
  // string is returned cast to T and blows up far away from the real cause.
  if (res.ok && !isJson) {
    throw new ApiError(
      res.status,
      `Expected JSON from ${API_URL}${path} but got ${res.headers.get("content-type") ?? "no content-type"}. Check that EXPO_PUBLIC_API_URL points at the API, not the app.`,
    );
  }

  // A 401 only means "session expired" when we actually sent a token and the
  // server rejected it. A 401 on an unauthenticated request (e.g. login) is a
  // credentials error — surface the server's message and do NOT sign out.
  if (res.status === 401 && sentToken) {
    onUnauthorized();
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  if (!res.ok) {
    const message =
      (isJson && payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    const details =
      isJson && payload && typeof payload === "object" && "details" in payload
        ? (payload as { details: unknown }).details
        : undefined;
    throw new ApiError(res.status, message, details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

export { API_URL };
