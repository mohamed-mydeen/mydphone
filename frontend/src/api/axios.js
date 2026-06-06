import axios from "axios";

// Use Vite proxy in dev (VITE_API_URL is empty/unset → use "/api" prefix)
// In production, set VITE_API_URL to the full backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : "/api",
  timeout: 15000,
});

// Attach JWT and Vault tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ecv_token");
  const vaultToken = sessionStorage.getItem("ecv_vault_token");
  const deviceId = localStorage.getItem("ecv_device_id");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (vaultToken) config.headers["X-Vault-Token"] = vaultToken;
  if (deviceId) config.headers["X-Device-Id"] = deviceId;
  return config;
});

// Global 401 → clear session
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem("ecv_token");
      localStorage.removeItem("ecv_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
