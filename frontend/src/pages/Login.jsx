import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldExclamationIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      navigate("/contacts");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Card */}
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
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "var(--brand)" }}
          >
            <ShieldExclamationIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--text-4)" }}>
            Sign in to Contact Vault
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="input-label">Email address</label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="input-label" style={{ marginBottom: 0 }}>
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--brand)" }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? "text" : "password"}
                className="input pr-10"
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-0.5"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw
                  ? <EyeSlashIcon className="w-4 h-4" />
                  : <EyeIcon className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full py-2.5 mt-1 text-sm font-semibold"
            disabled={loading}
            id="login-submit"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Sign in"}
          </button>
        </form>

      </div>
    </div>
  );
}
