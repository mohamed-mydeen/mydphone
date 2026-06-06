import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const VaultContext = createContext();

export function VaultProvider({ children }) {
  const { user, token } = useAuth();
  
  const [vaultToken, setVaultToken] = useState(() => sessionStorage.getItem("ecv_vault_token"));
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem("ecv_privacy_mode") === "true");
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => parseInt(localStorage.getItem("ecv_autolock") || "5"));
  const [hasPin, setHasPin] = useState(null);

  // Sync privacy mode & autolock
  useEffect(() => localStorage.setItem("ecv_privacy_mode", privacyMode), [privacyMode]);
  useEffect(() => localStorage.setItem("ecv_autolock", autoLockMinutes), [autoLockMinutes]);

  // Sync vault token
  useEffect(() => {
    if (vaultToken) sessionStorage.setItem("ecv_vault_token", vaultToken);
    else sessionStorage.removeItem("ecv_vault_token");
  }, [vaultToken]);

  // Fetch pin status on login
  useEffect(() => {
    const token = localStorage.getItem("ecv_token");
    if (user && token) {
      api.get("/security/pin/status").then(res => setHasPin(res.data.has_pin)).catch(() => {});
      registerDevice();
    } else {
      setVaultToken(null);
    }
  }, [user]);

  // Auto lock timer
  useEffect(() => {
    if (!vaultToken) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setVaultToken(null);
      }, autoLockMinutes * 60 * 1000);
    };

    resetTimer();
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, [vaultToken, autoLockMinutes]);

  const registerDevice = async () => {
    let deviceId = localStorage.getItem("ecv_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("ecv_device_id", deviceId);
    }
    const browserInfo = navigator.userAgent;
    try {
      await api.post("/security/devices", {
        device_id: deviceId,
        device_name: navigator.platform || "Unknown Device",
        browser_info: browserInfo
      });
    } catch {}
  };

  const verifyPin = async (pin) => {
    const res = await api.post("/security/pin/verify", { pin });
    setVaultToken(res.data.vault_token);
  };

  const setupPin = async (pin) => {
    await api.post("/security/pin/setup", { pin });
    setHasPin(true);
  };

  const lockVault = useCallback(() => {
    setVaultToken(null);
  }, []);

  return (
    <VaultContext.Provider value={{
      vaultToken,
      hasPin,
      isUnlocked: !!vaultToken,
      verifyPin,
      setupPin,
      lockVault,
      privacyMode,
      setPrivacyMode,
      autoLockMinutes,
      setAutoLockMinutes
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => useContext(VaultContext);
