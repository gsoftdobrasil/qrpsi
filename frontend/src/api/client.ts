import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const STORAGE_ACCESS = "qrpsi_access";
const STORAGE_REFRESH = "qrpsi_refresh";

export function getApiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  if (v && String(v).trim().length > 0) {
    return String(v).replace(/\/$/, "");
  }
  return "/api";
}

export function getPublicAppOrigin(): string {
  const v = import.meta.env.VITE_APP_PUBLIC_URL;
  if (v && String(v).trim().length > 0) {
    return String(v).replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function pesquisaPublicUrl(uuidLink: string): string {
  return `${getPublicAppOrigin()}/responder/${uuidLink}`;
}

export function getStoredTokens() {
  return {
    accessToken: sessionStorage.getItem(STORAGE_ACCESS),
    refreshToken: sessionStorage.getItem(STORAGE_REFRESH),
  };
}

export function setTokens(access: string, refresh: string) {
  sessionStorage.setItem(STORAGE_ACCESS, access);
  sessionStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens() {
  sessionStorage.removeItem(STORAGE_ACCESS);
  sessionStorage.removeItem(STORAGE_REFRESH);
}

export const api = axios.create({
  baseURL: getApiBase(),
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  const res = await axios.post(`${getApiBase()}/auth/refresh`, {
    refreshToken,
  });
  const { accessToken, refreshToken: newRefresh } = res.data as {
    accessToken: string;
    refreshToken: string;
  };
  setTokens(accessToken, newRefresh);
  return accessToken;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url ?? "";
  const isPublic =
    url.includes("/public/") ||
    url.startsWith("public/") ||
    config.url?.startsWith("/public/");
  if (!isPublic) {
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/")
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccess = await refreshPromise;
        if (newAccess) {
          original.headers.Authorization = `Bearer ${newAccess}`;
          return api(original);
        }
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(error);
  }
);
