import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCircleIcon,
  KeyIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import Avatar from "../components/Avatar";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";

function Section({ icon, title, danger, children }) {
  return (
    <div
      className="card"
      style={danger ? { borderColor: "rgba(239,68,68,.25)" } : {}}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: danger ? "rgba(239,68,68,.08)" : "var(--brand-l)",
            color: danger ? "#dc2626" : "var(--brand)",
          }}
        >
          {icon}
        </div>
        <h2
          className="text-sm font-semibold"
          style={{ color: danger ? "#dc2626" : "var(--text)" }}
        >
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { dark, toggleTheme }        = useTheme();
  const navigate                     = useNavigate();

  const [infoForm, setInfoForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [pwForm, setPwForm]     = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const setInfo = (f) => (e) => setInfoForm((p) => ({ ...p, [f]: e.target.value }));
  const setPw   = (f) => (e) => setPwForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await api.put("/profile", {
        name:  infoForm.name.trim(),
        email: infoForm.email.trim(),
      });
      updateUser(res.data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally { setSavingInfo(false); }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { toast.error("Passwords do not match"); return; }
    if (pwForm.new_password.length < 8)         { toast.error("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      await api.put("/profile", {
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      toast.success("Password updated successfully");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Change failed");
    } finally { setSavingPw(false); }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/profile");
      await logout();
      navigate("/login");
      toast.success("Account deleted");
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content max-w-3xl">

          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Settings</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-4)" }}>
              Manage your profile, security, and preferences
            </p>
          </div>

          {/* Profile card */}
          <div
            className="card flex items-center gap-4 p-5 mb-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
          >
            <Avatar name={user?.name} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>{user?.email}</p>
              <p
                className="text-2xs mt-1.5 font-medium"
                style={{ color: "var(--text-4)" }}
              >
                Member since{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Appearance */}
            <Section icon={dark ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />} title="Appearance">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
                    {dark ? "Dark mode" : "Light mode"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                    Switch between light and dark interface
                  </p>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={toggleTheme}
                  id="theme-toggle"
                  role="switch"
                  aria-checked={dark}
                  className="relative flex-shrink-0 transition-colors duration-200"
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "99px",
                    background: dark ? "var(--brand)" : "var(--border-2)",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform duration-200"
                    style={{
                      width: "20px",
                      height: "20px",
                      transform: dark ? "translateX(20px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>
            </Section>

            {/* Profile details */}
            <Section icon={<UserCircleIcon className="w-4 h-4" />} title="Profile details">
              <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prof-name" className="input-label">Full name</label>
                    <input
                      id="prof-name"
                      className="input"
                      value={infoForm.name}
                      onChange={setInfo("name")}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="prof-email" className="input-label">Email address</label>
                    <input
                      id="prof-email"
                      type="email"
                      className="input"
                      value={infoForm.email}
                      onChange={setInfo("email")}
                      required
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="btn-primary gap-2 text-xs px-4 py-2"
                    disabled={savingInfo}
                    id="save-profile-btn"
                  >
                    {savingInfo ? <LoadingSpinner size="sm" /> : <CheckIcon className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    Save changes
                  </button>
                </div>
              </form>
            </Section>

            {/* Security */}
            <Section icon={<KeyIcon className="w-4 h-4" />} title="Change password">
              <form onSubmit={handleChangePw} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="pw-cur" className="input-label">Current password</label>
                  <input
                    id="pw-cur"
                    type="password"
                    className="input"
                    value={pwForm.current_password}
                    onChange={setPw("current_password")}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pw-new" className="input-label">New password</label>
                    <input
                      id="pw-new"
                      type="password"
                      className="input"
                      value={pwForm.new_password}
                      onChange={setPw("new_password")}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="pw-conf" className="input-label">Confirm new password</label>
                    <input
                      id="pw-conf"
                      type="password"
                      className="input"
                      value={pwForm.confirm}
                      onChange={setPw("confirm")}
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                      required
                      style={pwForm.confirm && pwForm.confirm !== pwForm.new_password ? { borderColor: "#ef4444" } : {}}
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className="btn-primary gap-2 text-xs px-4 py-2"
                    disabled={savingPw}
                    id="change-pw-btn"
                  >
                    {savingPw ? <LoadingSpinner size="sm" /> : <KeyIcon className="w-3.5 h-3.5" strokeWidth={2} />}
                    Update password
                  </button>
                </div>
              </form>
            </Section>

            {/* Danger zone */}
            <Section icon={<TrashIcon className="w-4 h-4" />} title="Danger zone" danger>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-2)" }}>
                    Delete account
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-4)" }}>
                    Permanently delete your account and all saved contacts. This action is irreversible.
                  </p>
                </div>
                <button
                  className="btn-danger flex-shrink-0 text-xs px-4 py-2"
                  onClick={() => setShowDelete(true)}
                  id="delete-account-btn"
                >
                  Delete account
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {showDelete && (
        <Modal title="Delete account" onClose={() => setShowDelete(false)}>
          <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>
            Are you sure you want to delete your account?
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-4)" }}>
            All your contacts and data will be permanently erased. This cannot be undone.
          </p>
          <div className="flex gap-2.5">
            <button
              className="btn-danger flex-1"
              onClick={handleDeleteAccount}
              id="confirm-delete-account-btn"
            >
              Yes, delete my account
            </button>
            <button className="btn-secondary" onClick={() => setShowDelete(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
