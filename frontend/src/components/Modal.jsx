import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

export default function Modal({ title, onClose, children, size = "md" }) {
  // Close on Escape
  useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in`}
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full ${maxW} animate-slide-up max-h-[90dvh] flex flex-col`}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 20px 40px rgba(0,0,0,.18), 0 8px 16px rgba(0,0,0,.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            id="modal-title"
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
            style={{ marginRight: "-4px" }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
