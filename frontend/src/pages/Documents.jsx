import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon, DocumentIcon, TrashIcon, XMarkIcon,
  StarIcon, ShieldExclamationIcon, ArrowDownTrayIcon,
  FolderIcon, MagnifyingGlassIcon, Squares2X2Icon, ListBulletIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid, ShieldExclamationIcon as ShieldSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import DocumentUploadModal from "../components/DocumentUploadModal";
import Modal from "../components/Modal";

const CATEGORIES = [
  { label: "All", value: "All", icon: "📁" },
  { label: "Identity", value: "Identity Documents", icon: "🪪" },
  { label: "Education", value: "Education", icon: "🎓" },
  { label: "Medical", value: "Medical", icon: "🏥" },
  { label: "Finance", value: "Finance", icon: "💰" },
  { label: "Travel", value: "Travel", icon: "✈️" },
  { label: "Insurance", value: "Insurance", icon: "🛡️" },
  { label: "Emergency", value: "Emergency", icon: "🚨" },
  { label: "Other", value: "Other", icon: "📄" },
];

const FILE_TYPE_COLORS = {
  PDF: { bg: "#fef2f2", color: "#dc2626", darkBg: "rgba(220,38,38,.15)", darkColor: "#f87171" },
  JPG: { bg: "#eff6ff", color: "#2563eb", darkBg: "rgba(37,99,235,.15)", darkColor: "#60a5fa" },
  PNG: { bg: "#f0fdf4", color: "#16a34a", darkBg: "rgba(22,163,74,.15)", darkColor: "#4ade80" },
  WEBP: { bg: "#faf5ff", color: "#9333ea", darkBg: "rgba(147,51,234,.15)", darkColor: "#c084fc" },
};

function FileTypeBadge({ type }) {
  const c = FILE_TYPE_COLORS[type] || FILE_TYPE_COLORS.PDF;
  return (
    <span
      className="text-2xs font-bold px-1.5 py-0.5 rounded select-none uppercase"
      style={{ background: c.bg, color: c.color }}
    >
      {type}
    </span>
  );
}

function formatSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  const [showUpload, setShowUpload] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [stats, setStats] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.trim() === "4262") setIsAuthenticated(true);
    else toast.error("Incorrect password");
  };

  const loadDocs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "All") params.category = filter;
      const res = await api.get("/documents", { params });
      setDocs(res.data);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/documents/stats/usage");
      setStats(res.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDocs();
      loadStats();
    }
  }, [filter, isAuthenticated]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      setDocs(docs.filter(d => d.id !== deleteTarget.id));
      toast.success("Document deleted");
      setDeleteTarget(null);
      if (previewDoc?.id === deleteTarget.id) setPreviewDoc(null);
      loadStats();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const toggleFavorite = async (doc, e) => {
    e?.stopPropagation();
    try {
      const res = await api.patch(`/documents/${doc.id}/favorite`);
      setDocs(docs.map(d => d.id === doc.id ? res.data : d));
    } catch {
      toast.error("Failed to update");
    }
  };

  const toggleEmergency = async (doc, e) => {
    e?.stopPropagation();
    try {
      const res = await api.patch(`/documents/${doc.id}/emergency`);
      setDocs(docs.map(d => d.id === doc.id ? res.data : d));
    } catch {
      toast.error("Failed to update");
    }
  };

  const downloadDoc = async (doc, e) => {
    e?.stopPropagation();
    try {
      const res = await api.get(`/documents/${doc.id}/content`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.document_name}.${doc.file_type.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  const handleUploadSuccess = (newDocs) => {
    setShowUpload(false);
    loadDocs();
    loadStats();
  };

  const displayed = useMemo(() => {
    if (!query.trim()) return docs;
    const q = query.toLowerCase();
    return docs.filter(d =>
      d.document_name?.toLowerCase().includes(q) ||
      d.tags?.toLowerCase().includes(q) ||
      d.category?.toLowerCase().includes(q)
    );
  }, [docs, query]);

  const isSearching = !!query.trim();

  // ── PIN Gate ──
  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-content" style={{ maxWidth: 420, margin: "0 auto" }}>
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Access Restricted</h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-3)" }}>Enter the password to access the Document Vault.</p>
              <form onSubmit={handlePasswordSubmit}>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="pass keyword: ur favorite 4 digit number"
                  className="input mb-3"
                  autoFocus
                />
                <button type="submit" className="btn-primary w-full py-2.5">Unlock</button>
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
        <div className="page-content">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Document Vault</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                {stats ? `${stats.total_documents} documents • ${stats.total_size_mb} MB used` : "Loading…"}
              </p>
            </div>
            <button onClick={() => setShowUpload(true)} className="btn-primary gap-1.5 text-xs px-3 py-2">
              <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
              Upload
            </button>
          </div>

          {/* Search + View Toggle */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 max-w-md">
              <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} placeholder="Search documents…" />
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-2)" }}>
              <button
                onClick={() => setViewMode("grid")}
                className="p-2 transition-colors"
                style={{ background: viewMode === "grid" ? "var(--brand)" : "var(--surface)", color: viewMode === "grid" ? "#fff" : "var(--text-3)" }}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="p-2 transition-colors"
                style={{ background: viewMode === "list" ? "var(--brand)" : "var(--surface)", color: viewMode === "list" ? "#fff" : "var(--text-3)" }}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filters */}
          {!isSearching && (
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 hide-scrollbar">
              {CATEGORIES.map((c) => {
                const active = filter === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => setFilter(c.value)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 transition-all duration-100"
                    style={{
                      borderRadius: "var(--radius)",
                      background: active ? "var(--brand)" : "var(--surface)",
                      color: active ? "#fff" : "var(--text-3)",
                      border: active ? "1px solid var(--brand)" : "1px solid var(--border-2)",
                      boxShadow: active ? "0 1px 2px rgba(79,70,229,.2)" : "0 1px 2px rgba(0,0,0,.04)",
                    }}
                  >
                    <span>{c.icon}</span> {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<DocumentIcon className="w-6 h-6" strokeWidth={1.5} />}
              title={isSearching ? "No documents found" : "Vault is empty"}
              description={isSearching ? `No documents match "${query}".` : "Upload your first document to get started."}
              action={!isSearching && (
                <button className="btn-primary" onClick={() => setShowUpload(true)}>
                  <PlusIcon className="w-4 h-4" /> Upload document
                </button>
              )}
            />
          ) : viewMode === "grid" ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayed.map(doc => (
                <div
                  key={doc.id}
                  className="card p-4 cursor-pointer transition-all duration-150 hover:shadow-md flex flex-col gap-3"
                  onClick={() => setPreviewDoc(doc)}
                  style={{ borderRadius: "12px" }}
                >
                  {/* Icon + Type */}
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--brand-l)", color: "var(--brand)" }}>
                      <DocumentIcon className="w-5 h-5" />
                    </div>
                    <FileTypeBadge type={doc.file_type} />
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{doc.document_name}</p>
                    <p className="text-2xs mt-0.5" style={{ color: "var(--text-4)" }}>{doc.category}</p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xs" style={{ color: "var(--text-4)" }}>{formatSize(doc.file_size)}</span>
                    <div className="flex items-center gap-1">
                      {doc.is_emergency && (
                        <ShieldSolid className="w-3.5 h-3.5" style={{ color: "#dc2626" }} />
                      )}
                      {doc.is_favorite && (
                        <StarSolid className="w-3.5 h-3.5" style={{ color: "#d97706" }} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── List View ── */
            <div className="space-y-1.5">
              {displayed.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors duration-100"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  onClick={() => setPreviewDoc(doc)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--brand-l)", color: "var(--brand)" }}>
                    <DocumentIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{doc.document_name}</p>
                    <p className="text-2xs" style={{ color: "var(--text-4)" }}>
                      {doc.category} • {formatSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {doc.is_emergency && <ShieldSolid className="w-4 h-4" style={{ color: "#dc2626" }} />}
                    {doc.is_favorite && <StarSolid className="w-4 h-4" style={{ color: "#d97706" }} />}
                    <FileTypeBadge type={doc.file_type} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <DocumentUploadModal onClose={() => setShowUpload(false)} onUploadSuccess={handleUploadSuccess} />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Delete Document" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>
            Are you sure you want to permanently delete <strong>{deleteTarget.document_name}</strong>?
          </p>
          <div className="flex gap-2.5 mt-6">
            <button className="btn-danger flex-1" onClick={handleDelete}>Delete</button>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Preview / Detail Drawer */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90dvh] flex flex-col animate-slide-up"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 20px 40px rgba(0,0,0,.18)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--brand-l)", color: "var(--brand)" }}>
                  <DocumentIcon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{previewDoc.document_name}</h2>
                  <p className="text-2xs" style={{ color: "var(--text-4)" }}>{previewDoc.category}</p>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="btn-icon" aria-label="Close">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Inline preview for images */}
              {["JPG", "PNG", "WEBP"].includes(previewDoc.file_type) && (
                <SecureDocPreview docId={previewDoc.id} contentType={previewDoc.content_type} />
              )}

              {/* PDF inline preview */}
              {previewDoc.file_type === "PDF" && (
                <SecureDocPreview docId={previewDoc.id} contentType={previewDoc.content_type} />
              )}

              {/* Metadata */}
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Type", value: previewDoc.file_type },
                    { label: "Size", value: formatSize(previewDoc.file_size) },
                    { label: "Uploaded", value: formatDate(previewDoc.uploaded_at) },
                    { label: "Category", value: previewDoc.category },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2.5 rounded-lg" style={{ background: "var(--surface-2)" }}>
                      <p className="text-2xs font-semibold" style={{ color: "var(--text-4)" }}>{label}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text)" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {previewDoc.tags && (
                  <div>
                    <p className="text-2xs font-semibold mb-1.5" style={{ color: "var(--text-4)" }}>Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDoc.tags.split(",").map((t, i) => (
                        <span key={i} className="text-2xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "var(--brand-l)", color: "var(--brand)" }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 flex-shrink-0 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button className="btn-primary flex-1 text-xs py-2" onClick={(e) => downloadDoc(previewDoc, e)}>
                <ArrowDownTrayIcon className="w-4 h-4" /> Download
              </button>
              <button
                className="btn-icon"
                onClick={(e) => toggleFavorite(previewDoc, e)}
                title={previewDoc.is_favorite ? "Remove from favorites" : "Add to favorites"}
              >
                {previewDoc.is_favorite
                  ? <StarSolid className="w-4 h-4" style={{ color: "#d97706" }} />
                  : <StarIcon className="w-4 h-4" />}
              </button>
              <button
                className="btn-icon"
                onClick={(e) => toggleEmergency(previewDoc, e)}
                title={previewDoc.is_emergency ? "Remove emergency" : "Mark as emergency"}
              >
                {previewDoc.is_emergency
                  ? <ShieldSolid className="w-4 h-4" style={{ color: "#dc2626" }} />
                  : <ShieldExclamationIcon className="w-4 h-4" />}
              </button>
              <button className="btn-icon" style={{ color: "#ef4444" }} onClick={() => setDeleteTarget(previewDoc)}>
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Secure Document Preview ── */
function SecureDocPreview({ docId, contentType }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const res = await api.get(`/documents/${docId}/content`, { responseType: "blob" });
        if (active) {
          setSrc(URL.createObjectURL(res.data));
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    fetch();
    return () => { active = false; };
  }, [docId]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-10" style={{ background: "var(--surface-2)", borderRadius: 12 }}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-10" style={{ background: "var(--surface-2)", borderRadius: 12, color: "var(--text-4)" }}>
        <DocumentIcon className="w-8 h-8 mb-2" />
        <p className="text-xs">Preview unavailable</p>
      </div>
    );
  }

  if (contentType === "application/pdf") {
    return (
      <iframe
        src={src}
        className="w-full"
        style={{ height: "400px", borderRadius: 12, border: "1px solid var(--border)" }}
        title="PDF Preview"
      />
    );
  }

  return (
    <img
      src={src}
      alt="Document preview"
      className="w-full"
      style={{ borderRadius: 12, maxHeight: "400px", objectFit: "contain", background: "var(--surface-2)" }}
    />
  );
}
