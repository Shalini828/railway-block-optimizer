import { toast } from "sonner";

export const API_BASE =
  import.meta.env["VITE_API_BASE_URL"] ?? "http://127.0.0.1:8000";

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  // Normalize path if full URL is passed
  let cleanPath = path;
  if (cleanPath.startsWith("http://localhost:8000")) {
    cleanPath = cleanPath.replace("http://localhost:8000", "");
  } else if (cleanPath.startsWith("http://127.0.0.1:8000")) {
    cleanPath = cleanPath.replace("http://127.0.0.1:8000", "");
  }

  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }

  const url = `${API_BASE}${cleanPath}`;
  const headers = new Headers(init?.headers);

if (authToken && !headers.has("Authorization")) {
  headers.set("Authorization", `Bearer ${authToken}`);
}

if (
  init?.body &&
  typeof init.body === "string" &&
  !headers.has("Content-Type")
) {
  headers.set("Content-Type", "application/json");
}

  const config: RequestInit = {
    ...init,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401 && cleanPath !== "/auth/login") {
      toast.error("Session expired — please sign in again", {
        description: "सत्र समाप्त हो गया है — कृपया पुनः साइन इन करें",
      });
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    } else if (response.status === 403) {
      toast.error("Not authorised for this action", {
        description: "इस कार्रवाई के लिए अधिकृत नहीं हैं (Access Restricted)",
      });
    }

    return response;
  } catch (error) {
    throw error;
  }
}
