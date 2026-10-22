import { toast } from "sonner";

const LOCAL_API_BASE = "http://127.0.0.1:8000";
const PRODUCTION_API_BASE = "https://railway-block-optimizer-backend.vercel.app";

export const API_BASE = (
  import.meta.env["VITE_API_BASE_URL"] ||
  (import.meta.env.DEV ? LOCAL_API_BASE : PRODUCTION_API_BASE)
).replace(/\/+$/, "");

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let cleanPath = path.trim();

  const knownBases = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://railway-block-optimizer-backend.vercel.app",
    "https://railway-block-optimizer-backend.onrender.com",
  ];

  for (const base of knownBases) {
    if (cleanPath.startsWith(base)) {
      cleanPath = cleanPath.slice(base.length);
      break;
    }
  }

  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
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

  try {
    const response = await fetch(url, { ...init, headers });

    if (response.status === 401 && cleanPath !== "/auth/login") {
      toast.error("Session expired â€” please sign in again", {
        description: "à¤¸à¤¤à¥à¤° à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤¹à¥‹ à¤—à¤¯à¤¾ à¤¹à¥ˆ â€” à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤¨à¤ƒ à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚",
      });
      unauthorizedHandler?.();
    } else if (response.status === 403) {
      toast.error("Not authorised for this action", {
        description: "à¤‡à¤¸ à¤•à¤¾à¤°à¥à¤°à¤µà¤¾à¤ˆ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¤‚ (Access Restricted)",
      });
    }

    return response;
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
}

