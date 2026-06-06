import { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import LoadingSpinner from "./LoadingSpinner";
import Modal from "./Modal";
import { DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";

const CATEGORIES = [
  "Identity Documents", "Education", "Medical", "Finance",
  "Travel", "Insurance", "Emergency", "Other",
];

export default function DocumentUploadModal({ onClose, onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("Other");
  const [docName, setDocName] = useState("");
  const [tags, setTags] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 20MB)`);
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    if (valid.length === 1 && !docName) {
      setDocName(valid[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setUploading(true);
    const total = files.length;
    setProgress({ done: 0, total });
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const name = files.length === 1
        ? (docName.trim() || f.name.replace(/\.[^/.]+$/, ""))
        : f.name.replace(/\.[^/.]+$/, "");

      const formData = new FormData();
      formData.append("file", f);
      formData.append("document_name", name);
      formData.append("category", category);
      formData.append("is_emergency", isEmergency);
      if (tags.trim()) formData.append("tags", tags.trim());

      try {
        const res = await api.post("/documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        results.push(res.data);
      } catch (err) {
        toast.error(`Failed: ${f.name} — ${err.response?.data?.detail || "Error"}`);
      }
      setProgress({ done: i + 1, total });
    }

    setUploading(false);
    if (results.length > 0) {
      toast.success(`${results.length} document${results.length > 1 ? "s" : ""} uploaded securely`);
      onUploadSuccess(results);
    }
  };

  const formatSize = (b) => {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / 1024 / 1024).toFixed(1) + " MB";
  };

  return (
    <Modal title="Upload Document" onClose={onClose} size="lg">
      <form onSubmit={handleUpload}>
        <div className="space-y-4 mb-6">

          {/* Drop / Select Area */}
          <div
            className="w-full flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
            style={{
              minHeight: files.length > 0 ? "auto" : "160px",
              borderRadius: "12px",
              background: "var(--surface-2)",
              border: "2px dashed var(--border-2)",
              padding: files.length > 0 ? "12px" : "24px",
            }}
            onClick={() => fileInputRef.current.click()}
            onDrop={(e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } }); }}
            onDragOver={(e) => e.preventDefault()}
          >
            {files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--brand-l2)", color: "var(--brand)" }}>
                  <DocumentIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Tap to select files or drag & drop</p>
                <p className="text-xs" style={{ color: "var(--text-4)" }}>PDF, JPG, PNG or WEBP (Max 20MB each)</p>
              </div>
            ) : (
              <div className="w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--brand-l2)", color: "var(--brand)" }}>
                      <DocumentIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{f.name}</p>
                      <p className="text-2xs" style={{ color: "var(--text-4)" }}>{formatSize(f.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="p-1 rounded-full" style={{ color: "var(--text-4)" }}>
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => fileInputRef.current.click()}
                  className="text-xs font-medium w-full py-2 rounded-lg" style={{ color: "var(--brand)", background: "var(--brand-l)" }}>
                  + Add more files
                </button>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
            />
          </div>

          {/* Document Name */}
          {files.length === 1 && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-2)" }}>Document Name</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Aadhaar Card, Passport"
                className="input"
                disabled={uploading}
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-2)" }}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input" disabled={uploading}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-2)" }}>Tags (Optional)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. aadhaar, identity, government"
              className="input"
              disabled={uploading}
            />
            <p className="text-2xs mt-1" style={{ color: "var(--text-4)" }}>Comma-separated, helps with searching</p>
          </div>

          {/* Emergency toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="w-4 h-4 accent-red-500" disabled={uploading} />
            <span className="text-sm font-medium" style={{ color: isEmergency ? "#dc2626" : "var(--text-2)" }}>
              Mark as Emergency Document
            </span>
          </label>

          {/* Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-3)" }}>
                <span>Uploading…</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "var(--brand)", width: `${Math.round((progress.done / progress.total) * 100)}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <button type="submit" className="btn-primary flex-1" disabled={uploading || files.length === 0}>
            {uploading ? <LoadingSpinner size="sm" /> : `Upload ${files.length > 0 ? files.length : ""} Document${files.length !== 1 ? "s" : ""}`}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
