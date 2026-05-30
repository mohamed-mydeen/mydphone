import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ecv_user")); } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { access_token, user: u } = res.data;
    localStorage.setItem("ecv_token", access_token);
    localStorage.setItem("ecv_user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { access_token, user: u } = res.data;
    localStorage.setItem("ecv_token", access_token);
    localStorage.setItem("ecv_user", JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("ecv_token");
    localStorage.removeItem("ecv_user");
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    localStorage.setItem("ecv_user", JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
