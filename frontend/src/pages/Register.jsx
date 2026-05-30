import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldExclamationIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }
    if (form.password.length < 8)      { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created — welcome!");
      navigate("/contacts");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const PasswordStrength = () => {
    const p = form.password;
    if (!p) return null;
    const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1,2,3,4].map((i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? colors[score] : "var(--border-2)" }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: colors[score], minWidth: 40 }}>
          {labels[score]}
        </span>
      </div>
    );
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4 py-8"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm animate-scale-in"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 24px rgba(0,0,0,.08)",
          padding: "36px 32px",
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "var(--brand)" }}
          >
            <ShieldExclamationIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
            Create your account
          </h1>
          <p className="text-sm" style={{ color: "var(--text-4)" }}>
            Start managing your contacts securely
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="reg-name" className="input-label">Full name</label>
            <input
              id="reg-name"
              className="input"
              value={form.name}
              onChange={set("name")}
              placeholder="Jane Smith"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="input-label">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="input-label">Password</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPw ? "text" : "password"}
                className="input pr-10"
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-0.5"
                aria-label={showPw ? "Hide" : "Show"}
              >
                {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength />
          </div>

          <div>
            <label htmlFor="reg-confirm" className="input-label">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              className="input"
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              style={form.confirm && form.confirm !== form.password ? { borderColor: "#ef4444" } : {}}
            />
            {form.confirm && form.confirm !== form.password && (
              <p className="text-xs mt-1 font-medium" style={{ color: "#ef4444" }}>
                Passwords don't match
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-2.5 mt-1 text-sm font-semibold"
            disabled={loading}
            id="register-submit"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-4)" }}>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold transition-colors"
            style={{ color: "var(--brand)" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
