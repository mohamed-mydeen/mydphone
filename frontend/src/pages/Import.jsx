import { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Import() {
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState(null);
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) { setFile(f); setResult(null); }
    else toast.error("Please drop a .csv file");
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/contacts/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success(`${res.data.imported} contacts imported`);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally { setUploading(false); }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === "myd@4262") {
      setIsAuthenticated(true);
    } else {
      toast.error("Incorrect password");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-content max-w-md mx-auto">
            <div className="card p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>Access Restricted</h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>Please enter the password to access the Import page.</p>
              <form onSubmit={handlePasswordSubmit}>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 rounded-lg text-sm mb-4"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  autoFocus
                />
                <button type="submit" className="btn-primary w-full py-2.5 text-sm font-medium">
                  Verify Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content max-w-3xl">

          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-base font-bold mb-0.5" style={{ color: "var(--text)" }}>
              Import Contacts
            </h1>
            <p className="text-sm" style={{ color: "var(--text-4)" }}>
              Upload a CSV file to bulk-import contacts into your vault
            </p>
          </div>

          {/* CSV format reference */}
          <div
            className="card mb-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <DocumentTextIcon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--brand)" }} strokeWidth={2} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Required CSV format
              </h2>
            </div>
            <div className="p-5">
              <p className="text-xs mb-3" style={{ color: "var(--text-4)" }}>
                Your CSV must include a header row with these exact column names:
              </p>
              <div
                className="rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-3)",
                }}
              >
                <div style={{ color: "var(--brand)", fontWeight: 600 }}>
                  full_name, phone_number, alternate_number, email, address, notes, is_favorite, is_emergency
                </div>
                <div className="mt-2" style={{ color: "var(--text-4)" }}>
                  Jane Doe, +1 555 0001, , jane@example.com, , , false, true
                </div>
                <div style={{ color: "var(--text-4)" }}>
                  John Smith, +1 555 0002, +1 555 0003, , , , false, false
                </div>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current.click()}
            className="flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all duration-150 mb-5"
            id="csv-drop-zone"
            style={{
              minHeight: "180px",
              border: `2px dashed ${dragging ? "var(--brand)" : file ? "var(--brand)" : "var(--border-2)"}`,
              borderRadius: "var(--radius-xl)",
              background: dragging
                ? "var(--brand-l)"
                : file
                ? "rgba(79,70,229,.03)"
                : "var(--surface)",
              padding: "32px 24px",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: file || dragging ? "var(--brand-l2)" : "var(--surface-2)",
                color: file || dragging ? "var(--brand)" : "var(--text-4)",
              }}
            >
              <ArrowUpTrayIcon className="w-5 h-5" strokeWidth={2} />
            </div>

            {file ? (
              <>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                    {file.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
                    Drag & drop your CSV here
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>
                    or{" "}
                    <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse files</span>
                    {" "}— .csv format only
                  </p>
                </div>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-file-input"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) { setFile(f); setResult(null); }
                e.target.value = "";
              }}
            />
          </div>

          {/* Upload button */}
          {file && (
            <button
              className="btn-primary gap-2 px-5 py-2.5 text-sm animate-scale-in"
              onClick={handleUpload}
              disabled={uploading}
              id="import-upload-btn"
            >
              {uploading ? <LoadingSpinner size="sm" /> : <ArrowUpTrayIcon className="w-4 h-4" strokeWidth={2} />}
              {uploading ? "Importing…" : "Upload & import"}
            </button>
          )}

          {/* Result */}
          {result && (
            <div
              className="card mt-5 p-5 animate-slide-up"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>
                Import complete
              </h3>
              <div className="flex flex-col gap-3">
                {/* Imported */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(22,163,74,.08)", color: "#16a34a" }}
                  >
                    <CheckCircleIcon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      {result.imported} contact{result.imported !== 1 ? "s" : ""} imported
                    </p>
                  </div>
                </div>

                {/* Skipped */}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(245,158,11,.08)", color: "#d97706" }}
                    >
                      <XCircleIcon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>
                      {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped
                    </p>
                  </div>
                )}

                {/* Errors list */}
                {result.errors.length > 0 && (
                  <div
                    className="rounded-lg p-3 mt-1"
                    style={{
                      background: "rgba(245,158,11,.06)",
                      border: "1px solid rgba(245,158,11,.2)",
                    }}
                  >
                    <p className="text-xs font-semibold mb-1.5" style={{ color: "#d97706" }}>
                      Skipped rows:
                    </p>
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs" style={{ color: "var(--text-3)" }}>
                        • {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/contacts"
                className="btn-primary inline-flex mt-4 gap-2 text-xs px-4 py-2"
              >
                View contacts
                <ArrowRightIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
