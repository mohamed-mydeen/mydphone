import { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import LoadingSpinner from "./LoadingSpinner";
import Modal from "./Modal";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";

const ALBUMS = ["Personal", "Family", "Parents", "Emergency"];

export default function PhotoUploadModal({ onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [album, setAlbum] = useState("Personal");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        toast.error("File is too large (max 10MB)");
        return;
      }
      setFile(selected);
      // Create a local preview
      const url = URL.createObjectURL(selected);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a photo");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("album", album);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      
      const res = await api.post("/photos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      toast.success("Photo uploaded securely");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onUploadSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Upload Photo" onClose={onClose}>
      <form onSubmit={handleUpload}>
        <div className="space-y-4 mb-6">
          {/* File Upload / Preview Area */}
          <div 
            className="w-full flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
            style={{ 
              minHeight: "200px", 
              borderRadius: "12px",
              background: previewUrl ? "#000" : "var(--surface-2)",
              border: previewUrl ? "none" : "2px dashed var(--border-2)" 
            }}
            onClick={() => !previewUrl && fileInputRef.current.click()}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" style={{ maxHeight: "300px" }} />
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--brand-l2)", color: "var(--brand)" }}>
                  <PhotoIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Tap to select a photo</p>
                <p className="text-xs" style={{ color: "var(--text-4)" }}>JPG, PNG or WEBP (Max 10MB)</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-2)" }}>Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Vacation"
              className="input"
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-2)" }}>Album</label>
            <select 
              value={album} 
              onChange={(e) => setAlbum(e.target.value)}
              className="input"
              disabled={uploading}
            >
              {ALBUMS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button type="submit" className="btn-primary flex-1" disabled={uploading || !file}>
            {uploading ? <LoadingSpinner size="sm" /> : "Upload Securely"}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
