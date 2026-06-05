import { Link } from "react-router-dom";
import { LockClosedIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function ForgotPassword() {
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
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(234,179,8,.12)", color: "#ca8a04" }}
        >
          <LockClosedIcon className="w-6 h-6" strokeWidth={2} />
        </div>

        <h1 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
          Password Reset
        </h1>

        <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-4)" }}>
          This is a <strong style={{ color: "var(--text-3)" }}>private instance</strong>. Password
          resets are handled directly by the administrator.
        </p>

        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-4)" }}>
          If you've forgotten your password, please contact the admin to get it reset.
        </p>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: "var(--brand)" }}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
