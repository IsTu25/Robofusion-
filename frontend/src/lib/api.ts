const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchApi(endpoint: string, options: FetchOptions = {}) {
  const { requireAuth = true, ...customConfig } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = typeof window !== "undefined" ? localStorage.getItem("robofusion_token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      // In a real app, you might want to redirect to login or throw
      console.warn("API Call requires auth but no token found");
    }
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (response.status === 401) {
    // Trigger logout if unauthenticated
    if (typeof window !== "undefined") {
      localStorage.removeItem("robofusion_token");
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let errorMsg = "An error occurred";
    try {
      const data = await response.json();
      errorMsg = data.detail || errorMsg;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
