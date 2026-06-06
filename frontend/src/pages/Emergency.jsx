import { useState, useRef, useEffect } from "react";
import {
  PhoneIcon,
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { PhoneIcon as PhoneSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import api from "../api/axios";
import Avatar from "../components/Avatar";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import { DocumentIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

function formatSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

export default function Emergency() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  
  const [emergencyDocs, setEmergencyDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const timer = useRef(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get("/documents", { params: { emergency: true } });
        setEmergencyDocs(res.data);
      } catch {
        /* silent */
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  const downloadDoc = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/content`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.document_name}.${doc.file_type.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await api.get("/contacts/search", { params: { q: query } });
        setResults(res.data);
      } catch { toast.error("Search failed"); }
      finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content">

          {/* Page title */}
          <div className="mb-6">
            <h1 className="text-base font-bold mb-0.5" style={{ color: "var(--text)" }}>
              Emergency Contacts
            </h1>
            <p className="text-sm" style={{ color: "var(--text-4)" }}>
              Quickly search and dial any contact in one tap
            </p>
          </div>

          {/* Alert banner */}
          <div
            className="flex items-start gap-3.5 p-4 mb-6 rounded-xl"
            style={{
              background: "rgba(239,68,68,.06)",
              border: "1px solid rgba(239,68,68,.2)",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(239,68,68,.1)" }}
            >
              <ShieldExclamationIcon className="w-4 h-4" style={{ color: "#dc2626" }} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#b91c1c" }}>
                Emergency mode
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#ef4444" }}>
                Search any contact below. Tap a number to call immediately — no confirmation required.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <SearchBar
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search name or phone number…"
              autoFocus
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* No results */}
          {!loading && searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 select-none animate-fade-in">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--surface-2)" }}
              >
                <MagnifyingGlassIcon className="w-5 h-5" style={{ color: "var(--text-4)" }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-2)" }}>
                No contacts found
              </p>
              <p className="text-sm" style={{ color: "var(--text-4)" }}>
                No match for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {results.map((c) => (
                <div
                  key={c.id}
                  className="card p-4 flex items-center gap-4"
                  id={`emergency-contact-${c.id}`}
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
                >
                  {/* Avatar + info */}
                  <Avatar name={c.full_name} size="md" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {c.full_name}
                    </p>
                    {c.is_emergency && (
                      <span
                        className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{
                          background: "rgba(239,68,68,.08)",
                          color: "#b91c1c",
                          border: "1px solid rgba(239,68,68,.18)",
                        }}
                      >
                        <ShieldExclamationIcon className="w-2.5 h-2.5" />
                        Emergency
                      </span>
                    )}
                    {c.email && (
                      <p className="text-xs mt-1 truncate" style={{ color: "var(--text-4)" }}>
                        {c.email}
                      </p>
                    )}
                  </div>

                  {/* Dial buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <a
                      href={`tel:${c.phone_number}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-lg transition-all"
                      style={{ background: "#16a34a", boxShadow: "0 1px 3px rgba(22,163,74,.3)" }}
                      id={`call-${c.id}`}
                    >
                      <PhoneSolid className="w-3.5 h-3.5" />
                      {c.phone_number}
                    </a>
                    {c.alternate_number && (
                      <a
                        href={`tel:${c.alternate_number}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--text-2)",
                          border: "1px solid var(--border-2)",
                        }}
                      >
                        <PhoneIcon className="w-3.5 h-3.5" strokeWidth={2} />
                        Alt: {c.alternate_number}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Idle state: Show Emergency Documents & Search Prompt */}
          {!searched && (
            <div className="animate-fade-in">
              {/* Emergency Documents Section */}
              <div className="mb-8">
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
                  Critical Documents
                </h2>
                {loadingDocs ? (
                  <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
                ) : emergencyDocs.length === 0 ? (
                  <div className="p-4 rounded-xl text-center" style={{ background: "var(--surface-2)", border: "1px dashed var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-4)" }}>No emergency documents pinned.</p>
                    <p className="text-2xs mt-1" style={{ color: "var(--text-4)" }}>Go to Secure Vault to mark documents as Emergency.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {emergencyDocs.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,.1)", color: "#dc2626" }}>
                          <DocumentIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{doc.document_name}</p>
                          <p className="text-2xs" style={{ color: "var(--text-4)" }}>{doc.file_type} • {formatSize(doc.file_size)}</p>
                        </div>
                        <button onClick={() => downloadDoc(doc)} className="btn-icon p-2" style={{ color: "var(--text-3)", background: "var(--surface-2)" }}>
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Prompt */}
              <div
                className="flex flex-col items-center justify-center py-10 select-none"
                style={{ color: "var(--text-4)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "var(--surface-2)" }}
                >
                  <PhoneIcon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--text-3)" }}>
                  Ready to search contacts
                </p>
                <p className="text-xs text-center max-w-xs">
                  Type a name or phone number above to find emergency contacts instantly
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
