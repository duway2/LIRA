import axios from "axios";
import Cookies from "js-cookie";

const resolveApiBaseUrl = () => {
  const fallbackUrl = "http://localhost:8080/api/v1";
  const envUrl = process.env.NEXT_PUBLIC_API_URL || fallbackUrl;

  if (typeof window === "undefined") {
    return envUrl;
  }

  const frontendHost = window.location.hostname;
  const isLocalFrontend =
    frontendHost === "localhost" || frontendHost === "127.0.0.1";

  if (!isLocalFrontend) {
    return envUrl;
  }

  try {
    const parsed = new URL(envUrl);
    const isLocalApiHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (isLocalApiHost) {
      parsed.hostname = frontendHost;
      return parsed.toString().replace(/\/$/, "");
    }

    return envUrl;
  } catch {
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
