import { useState, useEffect } from "react";
import {
  ShieldCheckIcon, DevicePhoneMobileIcon, ClockIcon, KeyIcon, EyeSlashIcon,
  TrashIcon, BoltIcon, ExclamationTriangleIcon, ComputerDesktopIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { useVault } from "../context/VaultContext";
import LoadingSpinner from "../components/LoadingSpinner";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function getActionLabel(action) {
  const map = {
    upload: { label: "Uploaded File", color: "#2563eb", bg: "rgba(37,99,235,.1)" },
    download: { label: "Downloaded File", color: "#16a34a", bg: "rgba(22,163,74,.1)" },
    delete: { label: "Deleted File", color: "#dc2626", bg: "rgba(220,38,38,.1)" },
    pin_fail: { label: "Failed Unlock", color: "#ea580c", bg: "rgba(234,88,12,.1)" },
    pin_success: { label: "Unlocked Vault", color: "#059669", bg: "rgba(5,150,105,.1)" },
    pin_setup: { label: "Set up PIN", color: "#4f46e5", bg: "rgba(79,70,229,.1)" },
    vault_locked: { label: "Vault Locked Out", color: "#dc2626", bg: "rgba(220,38,38,.1)" },
  };
  return map[action] || { label: action, color: "var(--text-3)", bg: "var(--surface-2)" };
}

export default function SecurityDashboard() {
  const { isUnlocked, privacyMode, setPrivacyMode, autoLockMinutes, setAutoLockMinutes } = useVault();
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resLogs, resDev] = await Promise.all([
          api.get("/security/logs"),
          api.get("/security/devices")
        ]);
        setLogs(resLogs.data);
        setDevices(resDev.data);
      } catch {
        toast.error("Failed to load security data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const removeDevice = async (id) => {
    try {
      await api.delete(`/security/devices/${id}`);
      setDevices(devices.filter(d => d.device_id !== id));
      toast.success("Device revoked");
    } catch {
      toast.error("Failed to revoke device");
    }
  };

  const logoutAll = async () => {
    if (!window.confirm("This will log you out of all devices including this one. Continue?")) return;
    try {
      await api.post("/security/logout-all");
      toast.success("All devices logged out.");
      setTimeout(() => {
        localStorage.removeItem("ecv_token");
        window.location.href = "/login";
      }, 1000);
    } catch {
      toast.error("Failed to execute global logout");
    }
  };

  const currentDeviceId = localStorage.getItem("ecv_device_id");

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content" style={{ maxWidth: 800, margin: "0 auto" }}>
          
          <div className="mb-6">
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Security & Privacy</h1>
            <p className="text-sm" style={{ color: "var(--text-4)" }}>Manage your trusted devices, activity logs, and vault settings.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Vault Status */}
            <div className="card p-5" style={{ background: isUnlocked ? "rgba(22,163,74,.04)" : "rgba(220,38,38,.04)", border: `1px solid ${isUnlocked ? "rgba(22,163,74,.2)" : "rgba(220,38,38,.2)"}` }}>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheckIcon className="w-6 h-6" style={{ color: isUnlocked ? "#16a34a" : "#dc2626" }} />
                <h3 className="font-semibold" style={{ color: "var(--text)" }}>Vault Status</h3>
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: isUnlocked ? "#15803d" : "#b91c1c" }}>
                {isUnlocked ? "Unlocked" : "Locked"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-4)" }}>
                {isUnlocked ? `Auto-locks after ${autoLockMinutes} min of inactivity.` : "Vault is currently secured. PIN required."}
              </p>
            </div>

            {/* Privacy & Settings */}
            <div className="card p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <KeyIcon className="w-5 h-5" /> Vault Settings
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <EyeSlashIcon className="w-4 h-4" style={{ color: "var(--text-4)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Privacy Mode</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={privacyMode} onChange={(e) => setPrivacyMode(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" style={{ color: "var(--text-4)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Auto-Lock</span>
                </div>
                <select 
                  className="input py-1 px-2 text-xs w-auto m-0 h-8"
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                >
                  <option value={1}>1 min</option>
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Trusted Devices */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <DevicePhoneMobileIcon className="w-5 h-5" /> Trusted Devices
                </h3>
                <button onClick={logoutAll} className="text-xs font-semibold px-2 py-1 rounded" style={{ color: "#dc2626", background: "rgba(220,38,38,.1)" }}>
                  Revoke All
                </button>
              </div>

              {loading ? <LoadingSpinner size="sm" /> : (
                <div className="space-y-3">
                  {devices.map(dev => (
                    <div key={dev.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--surface-2)", border: dev.device_id === currentDeviceId ? "1px solid var(--brand)" : "1px solid transparent" }}>
                      <div className="flex items-center gap-3 min-w-0">
                        {dev.browser_info?.includes("Mobile") ? <DevicePhoneMobileIcon className="w-5 h-5 flex-shrink-0" /> : <ComputerDesktopIcon className="w-5 h-5 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                            {dev.device_name} {dev.device_id === currentDeviceId && <span className="text-2xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-1">Current</span>}
                          </p>
                          <p className="text-2xs truncate mt-0.5" style={{ color: "var(--text-4)" }}>
                            Last active: {formatDate(dev.last_login_at)}
                          </p>
                        </div>
                      </div>
                      {dev.device_id !== currentDeviceId && (
                        <button onClick={() => removeDevice(dev.device_id)} className="btn-icon p-1.5" style={{ color: "#dc2626" }}>
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Logs */}
            <div className="card p-5 flex flex-col h-96">
              <h3 className="font-semibold mb-4 flex items-center gap-2 flex-shrink-0" style={{ color: "var(--text)" }}>
                <BoltIcon className="w-5 h-5" /> Vault Activity
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {loading ? <LoadingSpinner size="sm" /> : logs.length === 0 ? (
                  <p className="text-xs text-center" style={{ color: "var(--text-4)" }}>No activity recorded yet.</p>
                ) : logs.map(log => {
                  const ui = getActionLabel(log.action);
                  return (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: ui.bg, color: ui.color }}>
                        {log.action.includes("fail") || log.action.includes("locked") ? <ExclamationTriangleIcon className="w-4 h-4" /> : <ShieldCheckIcon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{ui.label}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-2xs" style={{ color: "var(--text-4)" }}>
                          <span>{formatDate(log.timestamp)}</span>
                          <span>•</span>
                          <span className="truncate">{log.ip_address}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
