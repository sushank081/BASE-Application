// Export BASE_URL so other files can import it if necessary
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4200";

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to JSON if body is NOT FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Attach Bearer token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Ensure leading slash on endpoint to avoid URL malformation
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const response = await fetch(`${BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  // Intercept 401 Unauthorized (Expired or Invalid Token)
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("bat_mes_user");
      
      // Clear cookies
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      document.cookie = "bat_mes_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.detail || `HTTP Error ${response.status}`;
    throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
  }

  return data as T;
}