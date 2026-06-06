import { useState, useEffect, useMemo } from "react";
import { PlusIcon, PhotoIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import PhotoUploadModal from "../components/PhotoUploadModal";
import Modal from "../components/Modal";

const ALBUMS = [
  { label: "All Photos", value: "All" },
  { label: "Personal",   value: "Personal" },
  { label: "Family",     value: "Family" },
  { label: "Parents",    value: "Parents" },
  { label: "Emergency",  value: "Emergency" }
];

/* Component to securely load images using JWT token */
function SecureImage({ photoId, alt, className, style, onClick }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await api.get(`/photos/${photoId}/content`, { responseType: "blob" });
        if (active) {
          setSrc(URL.createObjectURL(res.data));
          setLoading(false);
        }
      } catch (err) {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [photoId]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ ...style, background: "var(--surface-2)" }}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`${className} flex flex-col items-center justify-center`} style={{ ...style, background: "var(--surface-2)", color: "var(--text-4)" }}>
        <PhotoIcon className="w-6 h-6" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} style={{ ...style, objectFit: "cover" }} onClick={onClick} loading="lazy" />;
}

export default function Photos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  
  const [showUpload, setShowUpload] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPhotos = async (albumFilter = "All") => {
    setLoading(true);
    try {
      const params = albumFilter !== "All" ? { album: albumFilter } : {};
      const res = await api.get("/photos", { params });
      setPhotos(res.data);
    } catch {
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos(filter);
  }, [filter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/photos/${deleteTarget.id}`);
      setPhotos(photos.filter(p => p.id !== deleteTarget.id));
      toast.success("Photo deleted");
      setDeleteTarget(null);
      if (previewPhoto?.id === deleteTarget.id) {
        setPreviewPhoto(null);
      }
    } catch {
      toast.error("Failed to delete photo");
    }
  };

  const handleUploadSuccess = (newPhoto) => {
    setShowUpload(false);
    if (filter === "All" || filter === newPhoto.album) {
      setPhotos([newPhoto, ...photos]);
    }
  };

  const displayed = useMemo(() => {
    if (!query.trim()) return photos;
    const q = query.toLowerCase();
    return photos.filter(p => p.title?.toLowerCase().includes(q));
  }, [photos, query]);

  const isSearching = !!query.trim();

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content">
          
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Secure Vault</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </p>
            </div>
            <button onClick={() => setShowUpload(true)} className="btn-primary gap-1.5 text-xs px-3 py-2">
              <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
              Upload
            </button>
          </div>

          <div className="mb-4 max-w-md">
            <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} placeholder="Search photos by title..." />
          </div>

          {/* Filters */}
          {!isSearching && (
            <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 hide-scrollbar">
              {ALBUMS.map((f) => {
                const active = filter === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 transition-all duration-100"
                    style={{
                      borderRadius: "var(--radius)",
                      background: active ? "var(--brand)" : "var(--surface)",
                      color: active ? "#fff" : "var(--text-3)",
                      border: active ? "1px solid var(--brand)" : "1px solid var(--border-2)",
                      boxShadow: active ? "0 1px 2px rgba(79,70,229,.2)" : "0 1px 2px rgba(0,0,0,.04)",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Gallery */}
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<PhotoIcon className="w-6 h-6" strokeWidth={1.5} />}
              title={isSearching ? "No photos found" : "Vault is empty"}
              description={isSearching ? `No photos match "${query}".` : "Upload a photo to get started."}
              action={!isSearching && (
                <button className="btn-primary" onClick={() => setShowUpload(true)}>
                  <PlusIcon className="w-4 h-4" /> Upload photo
                </button>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in">
              {displayed.map(photo => (
                <div 
                  key={photo.id} 
                  className="relative group cursor-pointer overflow-hidden"
                  style={{ borderRadius: "12px", aspectRatio: "1/1", background: "var(--surface)", border: "1px solid var(--border)" }}
                  onClick={() => setPreviewPhoto(photo)}
                >
                  <SecureImage photoId={photo.id} alt={photo.title || "Photo"} className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
                  
                  {/* Overlay for metadata & actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(photo); }}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/80 text-white transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {photo.title && (
                      <p className="text-white text-xs font-medium truncate drop-shadow-md">{photo.title}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <PhotoUploadModal onClose={() => setShowUpload(false)} onUploadSuccess={handleUploadSuccess} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete Photo" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>Are you sure you want to delete this photo?</p>
          <div className="flex gap-2.5 mt-6">
            <button className="btn-danger flex-1" onClick={handleDelete}>Delete</button>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Fullscreen Preview */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            onClick={() => setPreviewPhoto(null)}
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
          
          <div className="max-w-full max-h-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <SecureImage 
              photoId={previewPhoto.id} 
              alt={previewPhoto.title || "Preview"} 
              className="max-w-full rounded-md" 
              style={{ maxHeight: "80vh", objectFit: "contain" }} 
            />
            
            <div className="mt-4 flex flex-col items-center text-white">
              <h3 className="text-base font-medium">{previewPhoto.title || "Untitled"}</h3>
              <p className="text-xs text-white/60 mt-1">
                Album: {previewPhoto.album} • {(previewPhoto.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button 
                onClick={() => setDeleteTarget(previewPhoto)}
                className="mt-4 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-full bg-red-400/10"
              >
                <TrashIcon className="w-4 h-4" /> Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
