import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";

/* ── Feature bullets shown on the left panel ── */
const FEATURES = [
  { icon: "🔒", text: "End-to-end secure contact storage" },
  { icon: "⚡", text: "Instant emergency contact access" },
  { icon: "📱", text: "Available on all your devices" },
];

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
    <div style={{ minHeight: "100dvh", display: "flex", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── LEFT PANEL — Brand / Hero ── */}
      <div
        style={{
          flex: "0 0 45%",
          background: "linear-gradient(145deg, #0f0c29 0%, #302b63 55%, #24243e 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 48px",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-left-panel"
      >
        {/* Decorative orbs */}
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", left: "-60px",
          width: "280px", height: "280px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "45%", left: "5%",
          width: "140px", height: "140px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo mark */}
        <div style={{
          width: "72px", height: "72px", borderRadius: "20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "28px",
          boxShadow: "0 8px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        {/* Brand name */}
        <h1 style={{
          color: "#ffffff", fontSize: "28px", fontWeight: "700",
          letterSpacing: "-0.03em", marginBottom: "8px", textAlign: "center",
        }}>
          Contact Vault
        </h1>
        <p style={{
          color: "rgba(199,210,254,0.75)", fontSize: "13px", fontWeight: "500",
          letterSpacing: "0.08em", textTransform: "uppercase",
          marginBottom: "52px", textAlign: "center",
        }}>
          Enterprise Contact Management
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%", maxWidth: "320px" }}>
          {FEATURES.map(({ icon, text }) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: "14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px", padding: "14px 18px",
              backdropFilter: "blur(8px)",
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
              <span style={{ color: "rgba(226,232,255,0.85)", fontSize: "13px", fontWeight: "500", lineHeight: 1.4 }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Footer quote */}
        <p style={{
          position: "absolute", bottom: "28px",
          color: "rgba(148,163,252,0.4)", fontSize: "11px",
          letterSpacing: "0.02em", textAlign: "center",
        }}>
          Private Instance · Secure Access Only
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div style={{
        flex: 1,
        background: "var(--surface, #ffffff)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        position: "relative",
      }}
        className="login-right-panel"
      >
        {/* Top-right company tag */}
        <div style={{
          position: "absolute", top: "28px", right: "32px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
          }} />
          <span style={{ fontSize: "12px", color: "var(--text-4, #9ca3af)", fontWeight: "500" }}>
            System Online
          </span>
        </div>

        <div style={{ width: "100%", maxWidth: "380px" }}>

          {/* Heading */}
          <div style={{ marginBottom: "36px" }}>
            <p style={{
              fontSize: "12px", fontWeight: "600", letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--brand, #4f46e5)",
              marginBottom: "10px",
            }}>
              Secure Sign In
            </p>
            <h2 style={{
              fontSize: "26px", fontWeight: "700", letterSpacing: "-0.03em",
              color: "var(--text, #111827)", lineHeight: 1.2, marginBottom: "8px",
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-3, #6b7280)", fontWeight: "400" }}>
              Enter your credentials to access your vault
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block", fontSize: "12px", fontWeight: "600",
                  color: "var(--text-3, #6b7280)", marginBottom: "6px",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="input"
                value={form.email}
                onChange={set("email")}
                placeholder="your@company.com"
                autoComplete="email"
                required
                style={{ height: "46px", fontSize: "14px" }}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: "12px", fontWeight: "600",
                    color: "var(--text-3, #6b7280)",
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: "12px", fontWeight: "500",
                    color: "var(--brand, #4f46e5)", textDecoration: "none",
                  }}
                >
                  Need help?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  className="input"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  style={{ height: "46px", fontSize: "14px", paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: "4px",
                    color: "var(--text-4, #9ca3af)", display: "flex", alignItems: "center",
                  }}
                >
                  {showPw
                    ? <EyeSlashIcon style={{ width: "18px", height: "18px" }} />
                    : <EyeIcon style={{ width: "18px", height: "18px" }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                height: "48px",
                width: "100%",
                background: loading
                  ? "var(--brand, #4f46e5)"
                  : "linear-gradient(135deg, #4f46e5, #6d28d9)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                letterSpacing: "0.02em",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 6px 20px rgba(79,70,229,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(79,70,229,0.35)"; }}
            >
              {loading ? <LoadingSpinner size="sm" /> : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Sign In to Vault
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px", margin: "28px 0 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border, #e8eaef)" }} />
            <span style={{ fontSize: "11px", color: "var(--text-4, #9ca3af)", fontWeight: "500", whiteSpace: "nowrap" }}>
              PRIVATE INSTANCE
            </span>
            <div style={{ flex: 1, height: "1px", background: "var(--border, #e8eaef)" }} />
          </div>

          <p style={{
            marginTop: "14px", textAlign: "center",
            fontSize: "12px", color: "var(--text-4, #9ca3af)", lineHeight: 1.6,
          }}>
            Access is restricted to authorized personnel only.<br />
            Contact the administrator if you need assistance.
          </p>

        </div>

        {/* Bottom version tag */}
        <p style={{
          position: "absolute", bottom: "20px",
          fontSize: "11px", color: "var(--text-4, #9ca3af)",
          letterSpacing: "0.02em",
        }}>
          Contact Vault · v1.0 · Secure
        </p>
      </div>

      {/* ── Responsive: hide left panel on mobile ── */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { padding: 40px 24px !important; }
        }
      `}</style>
    </div>
  );
}
