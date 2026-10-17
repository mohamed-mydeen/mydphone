import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { setVaultTokenHeader, setOnVaultLocked } from "../api/axios";
import { useAuth } from "./AuthContext";

const VaultContext = createContext();

export function VaultProvider({ children }) {
  const { user } = useAuth();
  
  // NEVER initialize or restore vaultToken from persistent browser storage.
  // The vault always starts in the LOCKED state on initial load, reload, or browser restart.
  const [vaultToken, setVaultToken] = useState(null);
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem("ecv_privacy_mode") === "true");
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => {
    const saved = parseInt(localStorage.getItem("ecv_autolock") || "5", 10);
    return isNaN(saved) || saved <= 0 ? 5 : saved;
  });
  const [hasPin, setHasPin] = useState(null);

  const lastActivityRef = useRef(Date.now());
  const lastThrottleRef = useRef(0);

  // Sync privacy mode & autolock settings (user preferences, safe to persist)
  useEffect(() => localStorage.setItem("ecv_privacy_mode", privacyMode), [privacyMode]);
  useEffect(() => localStorage.setItem("ecv_autolock", autoLockMinutes.toString()), [autoLockMinutes]);

  // Keep in-memory axios header in sync with vaultToken state
  useEffect(() => {
    setVaultTokenHeader(vaultToken);
  }, [vaultToken]);

  const lockVault = useCallback(() => {
    setVaultToken(null);
    setVaultTokenHeader(null);
    try {
      sessionStorage.removeItem("ecv_vault_token");
      sessionStorage.removeItem("secure_vault_contacts");
    } catch {}
  }, []);

  // Listen for backend 403 vault locked events from axios
  useEffect(() => {
    setOnVaultLocked(() => {
      lockVault();
    });
    return () => setOnVaultLocked(null);
  }, [lockVault]);

  // Fetch pin status on login and clean up on logout
  useEffect(() => {
    const token = localStorage.getItem("ecv_token");
    if (user && token) {
      api.get("/security/pin/status")
        .then(res => setHasPin(res.data.has_pin))
        .catch(() => {});
      registerDevice();
    } else {
      lockVault();
    }
  }, [user, lockVault]);

  // Record user interaction (throttled to avoid performance overhead)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current > 500) {
      lastThrottleRef.current = now;
      lastActivityRef.current = now;
    }
  }, []);

  // Auto-lock timer and visibility change handler
  useEffect(() => {
    if (!vaultToken) return;

    // Reset activity on entering unlocked state
    lastActivityRef.current = Date.now();

    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= autoLockMinutes * 60 * 1000) {
        lockVault();
      }
    };

    // Periodic check every 2 seconds
    const intervalId = setInterval(checkTimeout, 2000);

    // Immediate check on tab visibility change (e.g. user switching back to tab after being away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTimeout();
      }
    };

    const events = ["mousedown", "mousemove", "keypress", "keydown", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      events.forEach(e => window.removeEventListener(e, recordActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [vaultToken, autoLockMinutes, lockVault, recordActivity]);

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
    const res = await api.post("/security/pin/verify", {
      pin,
      timeout_minutes: autoLockMinutes,
    });
    setVaultToken(res.data.vault_token);
    lastActivityRef.current = Date.now();
    return res.data;
  };

  const setupPin = async (pin) => {
    const res = await api.post("/security/pin/setup", { pin });
    setHasPin(true);
    if (res.data?.vault_token) {
      setVaultToken(res.data.vault_token);
      lastActivityRef.current = Date.now();
    }
    return res.data;
  };

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
      setAutoLockMinutes,
      recordActivity,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => useContext(VaultContext);

