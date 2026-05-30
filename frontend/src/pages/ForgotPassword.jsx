import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldExclamationIcon, EnvelopeIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setLoading(true);
    // Simulate — backend may not have this endpoint
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-4"
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
        {!submitted ? (
          <>
            <div className="flex flex-col items-center mb-7">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--brand)" }}
              >
                <ShieldExclamationIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
                Reset password
              </h1>
              <p className="text-sm text-center" style={{ color: "var(--text-4)" }}>
                Enter your email and we'll send reset instructions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="forgot-email" className="input-label">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full py-2.5 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 mt-5 text-sm font-medium transition-colors"
              style={{ color: "var(--text-4)" }}
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              Back to sign in
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center text-center animate-scale-in">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(22,163,74,.1)", color: "#16a34a" }}
            >
              <EnvelopeIcon className="w-6 h-6" strokeWidth={2} />
            </div>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>
              Check your inbox
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-4)" }}>
              If <strong style={{ color: "var(--text-3)" }}>{email}</strong> is registered,
              you'll receive a password reset link shortly.
            </p>
            <Link to="/login" className="btn-secondary w-full justify-center py-2.5 text-sm">
              Return to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
