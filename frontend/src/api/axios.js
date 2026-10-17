import axios from "axios";

// Clean up any stale tokens or cached contacts from previous versions
try {
  sessionStorage.removeItem("ecv_vault_token");
  sessionStorage.removeItem("secure_vault_contacts");
} catch {}

// Use Vite proxy in dev (VITE_API_URL is empty/unset → use "/api" prefix)
// In production, set VITE_API_URL to the full backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : "/api",
  timeout: 15000,
});

// Vault token is strictly held in application memory, NEVER persisted to disk or storage
let inMemoryVaultToken = null;
let onVaultLockedCallback = null;

export const setVaultTokenHeader = (token) => {
  inMemoryVaultToken = token || null;
};

export const getVaultTokenHeader = () => inMemoryVaultToken;

export const setOnVaultLocked = (cb) => {
  onVaultLockedCallback = cb;
};

// Attach JWT and Vault tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ecv_token");
  const deviceId = localStorage.getItem("ecv_device_id");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (inMemoryVaultToken) config.headers["X-Vault-Token"] = inMemoryVaultToken;
  if (deviceId) config.headers["X-Device-Id"] = deviceId;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Global 401 → clear session
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("ecv_token");
      localStorage.removeItem("ecv_user");
      inMemoryVaultToken = null;
      window.location.href = "/login";
    }

    // 403 Vault locked → lock frontend vault state immediately
    if (
      err.response?.status === 403 &&
      typeof err.response?.data?.detail === "string" &&
      err.response?.data?.detail.includes("Vault access locked")
    ) {
      inMemoryVaultToken = null;
      if (typeof onVaultLockedCallback === "function") {
        onVaultLockedCallback();
      }
    }

    return Promise.reject(err);
  }
);

export default api;

