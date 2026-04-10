import axios from "axios";
import Cookies from "js-cookie";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const resolveApiBaseUrl = () => {
  const fallbackUrl = "http://localhost:8080/api/v1";
  const envUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  if (typeof window === "undefined") {
    return envUrl || fallbackUrl;
  }

  const frontendHost = window.location.hostname;
  const isLocalFrontend = LOCAL_HOSTS.has(frontendHost);
  const currentOrigin = window.location.origin;

  if (!envUrl) {
    if (!isLocalFrontend) {
      return `${currentOrigin}/api/v1`;
    }
    return fallbackUrl;
  }

  try {
    const parsed = new URL(envUrl);
    const isLocalApiHost = LOCAL_HOSTS.has(parsed.hostname);

    if (isLocalFrontend && isLocalApiHost) {
      parsed.hostname = frontendHost;
      return parsed.toString().replace(/\/$/, "");
    }

    if (!isLocalFrontend && isLocalApiHost) {
      const apiPath = parsed.pathname.replace(/\/$/, "") || "/api/v1";
      return `${currentOrigin}${apiPath}`;
    }

    return envUrl.replace(/\/$/, "");
  } catch {
    if (!isLocalFrontend) {
      const normalized = envUrl.startsWith("/")
        ? envUrl.replace(/\/$/, "")
        : "/api/v1";
      return normalized.startsWith("/")
        ? `${currentOrigin}${normalized}`
        : `${currentOrigin}/api/v1`;
    }

    return fallbackUrl;
  }
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
