import { useState, useEffect, useCallback, useRef } from "react";
import { PlusIcon, ArrowDownTrayIcon, UsersIcon, FunnelIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../api/axios";
import ContactCard from "../components/ContactCard";
import ContactForm from "../components/ContactForm";
import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import Navbar from "../components/Navbar";

const FILTERS = [
  { label: "All contacts", value: "all" },
  { label: "Favorites",    value: "favorite" },
  { label: "Emergency",    value: "emergency" },
];

export default function Contacts() {
  const [contacts, setContacts]         = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [query, setQuery]               = useState("");
  const [filter, setFilter]             = useState("all");
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [viewTarget, setViewTarget]     = useState(null);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const searchTimer = useRef(null);

  const loadContacts = useCallback(async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (f === "favorite")  params.favorite  = true;
      if (f === "emergency") params.emergency = true;
      const res = await api.get("/contacts", { params });
      setContacts(res.data.contacts);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadContacts(1, filter); }, [filter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.get("/contacts/search", { params: { q: query } });
        setSearchResults(res.data);
      } catch { toast.error("Search failed"); }
    }, 280);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/contacts/${editTarget.id}`, payload);
        toast.success("Contact updated");
      } else {
        await api.post("/contacts", payload);
        toast.success("Contact added");
      }
      setShowForm(false); setEditTarget(null);
      loadContacts(page, filter);
      if (query) setQuery("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/contacts/${deleteTarget.id}`);
      toast.success("Contact deleted");
      setDeleteTarget(null);
      loadContacts(page, filter);
    } catch { toast.error("Delete failed"); }
  };

  const toggleFavorite = async (contact) => {
    try {
      await api.put(`/contacts/${contact.id}`, { is_favorite: !contact.is_favorite });
      const update = (list) => list.map((c) => c.id === contact.id ? { ...c, is_favorite: !c.is_favorite } : c);
      setContacts(update);
      if (searchResults) setSearchResults(update);
    } catch { toast.error("Update failed"); }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/contacts/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "contacts.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Contacts exported");
    } catch { toast.error("Export failed"); }
  };

  const displayed    = searchResults ?? contacts;
  const isSearching  = !!query.trim();

  // Group alphabetically
  const grouped = displayed.reduce((acc, c) => {
    const l = c.full_name[0]?.toUpperCase() ?? "#";
    if (!acc[l]) acc[l] = [];
    acc[l].push(c);
    return acc;
  }, {});
  const letters = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Contacts</h1>
              {!isSearching && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                  {total} {total === 1 ? "contact" : "contacts"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="btn-secondary gap-1.5 text-xs px-3 py-2"
                id="export-btn"
                title="Export as CSV"
              >
                <ArrowDownTrayIcon className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true); }}
                className="btn-primary gap-1.5 text-xs px-3 py-2"
                id="add-contact-btn"
              >
                <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
                Add contact
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <SearchBar value={query} onChange={setQuery} onClear={() => setQuery("")} />
          </div>

          {/* Filter tabs */}
          {!isSearching && (
            <div className="flex gap-1.5 mb-5">
              {FILTERS.map((f) => {
                const active = filter === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setPage(1); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 transition-all duration-100"
                    style={{
                      borderRadius: "var(--radius)",
                      background: active ? "var(--brand)" : "var(--surface)",
                      color: active ? "#fff" : "var(--text-3)",
                      border: active ? "1px solid var(--brand)" : "1px solid var(--border-2)",
                      boxShadow: active ? "0 1px 2px rgba(79,70,229,.2)" : "0 1px 2px rgba(0,0,0,.04)",
                    }}
                    id={`filter-${f.value}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Content */}
          {loading ? (
            // Skeleton loading rows
            <div className="card overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
              <div className="px-5 py-2.5" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                <div className="skeleton h-3 w-16 rounded" />
              </div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="skeleton h-3 rounded" style={{ width: `${120 + (i % 3) * 40}px` }} />
                    <div className="skeleton h-2.5 rounded" style={{ width: `${80 + (i % 4) * 20}px` }} />
                  </div>
                  <div className="hidden md:flex gap-8">
                    <div className="skeleton h-3 rounded" style={{ width: "100px" }} />
                    <div className="skeleton h-3 rounded" style={{ width: "120px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="w-6 h-6" strokeWidth={1.5} />}
              title={isSearching ? "No results found" : "No contacts yet"}
              description={
                isSearching
                  ? `No contacts match "${query}". Try a different search.`
                  : "Add your first contact to get started."
              }
              action={
                !isSearching && (
                  <button className="btn-primary" onClick={() => setShowForm(true)}>
                    <PlusIcon className="w-4 h-4" />
                    Add contact
                  </button>
                )
              }
            />
          ) : (
            <div
              className="card overflow-hidden animate-fade-in"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
            >

              {/* Rows */}
              {isSearching ? (
                  <div>
                    {displayed.map((c, i) => (
                      <div key={c.id} className="animate-list-item" style={{ borderBottom: "1px solid var(--border)", animationDelay: `${i * 30}ms` }}>
                          <ContactCard
                            contact={c}
                            onView={setViewTarget}
                            onEdit={(c) => { setEditTarget(c); setShowForm(true); }}
                            onDelete={setDeleteTarget}
                            onToggleFavorite={toggleFavorite}
                          />
                      </div>
                    ))}
                  </div>
                ) : (
                  letters.map((letter) => (
                    <div key={letter}>
                      <div
                        className="px-5 py-1.5 section-label"
                        style={{
                          background: "var(--surface-2)",
                          borderTop: "1px solid var(--border)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {letter}
                      </div>
                      {grouped[letter].map((c, i) => (
                        <div key={c.id} className="animate-list-item" style={{ borderBottom: "1px solid var(--border)", animationDelay: `${i * 30}ms` }}>
                          <ContactCard
                            contact={c}
                            onEdit={(c) => { setEditTarget(c); setShowForm(true); }}
                            onDelete={setDeleteTarget}
                            onToggleFavorite={toggleFavorite}
                          />
                        </div>
                      ))}
                    </div>
                  ))
                )}
            </div>
          )}

          {/* Pagination */}
          {!isSearching && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                className="btn-secondary px-4 py-2 text-xs"
                disabled={page === 1}
                onClick={() => loadContacts(page - 1)}
              >
                Previous
              </button>
              <span
                className="text-xs font-medium px-3 py-2"
                style={{ color: "var(--text-3)" }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-secondary px-4 py-2 text-xs"
                disabled={page === totalPages}
                onClick={() => loadContacts(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal
          title={editTarget ? "Edit Contact" : "New Contact"}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        >
          <ContactForm
            initial={editTarget}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditTarget(null); }}
            loading={saving}
          />
        </Modal>
      )}

      {/* View Contact Details Modal */}
      {viewTarget && (
        <Modal title="Contact Details" onClose={() => setViewTarget(null)}>
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 mb-4 rounded-full flex items-center justify-center text-3xl font-semibold" style={{ background: "var(--brand-l2)", color: "var(--brand)" }}>
              {viewTarget.full_name[0]?.toUpperCase() || "#"}
            </div>
            <h2 className="text-xl font-bold text-center mb-2" style={{ color: "var(--text)" }}>
              {viewTarget.full_name}
            </h2>
            <div className="flex gap-2 flex-wrap justify-center">
              {viewTarget.is_favorite && (
                <span className="badge-favorite px-3 py-1">Favorite</span>
              )}
              {viewTarget.is_emergency && (
                <span className="badge-emergency px-3 py-1">Emergency</span>
              )}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {viewTarget.phone_number && (
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: "var(--surface-2)" }}>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Primary Phone</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{viewTarget.phone_number}</p>
                </div>
                <a href={`tel:${viewTarget.phone_number}`} className="btn-icon" style={{ color: "#16a34a", background: "rgba(22,163,74,.08)" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </a>
              </div>
            )}
            
            {viewTarget.alternate_number && (
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: "var(--surface-2)" }}>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Alternate Phone</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{viewTarget.alternate_number}</p>
                </div>
                <a href={`tel:${viewTarget.alternate_number}`} className="btn-icon" style={{ color: "#16a34a", background: "rgba(22,163,74,.08)" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </a>
              </div>
            )}

            {viewTarget.email && (
              <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Email</p>
                <p className="text-sm font-medium break-all" style={{ color: "var(--text)" }}>{viewTarget.email}</p>
              </div>
            )}

            {viewTarget.address && (
              <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Address</p>
                <p className="text-sm font-medium whitespace-pre-wrap" style={{ color: "var(--text)" }}>{viewTarget.address}</p>
              </div>
            )}

            {viewTarget.notes && (
              <div className="p-3 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Notes</p>
                <p className="text-sm font-medium whitespace-pre-wrap" style={{ color: "var(--text)" }}>{viewTarget.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5">
            <button className="btn-primary flex-1" onClick={() => { setEditTarget(viewTarget); setViewTarget(null); setShowForm(true); }}>
              Edit contact
            </button>
            <button className="btn-secondary" onClick={() => setViewTarget(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete contact" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>
            Delete <strong style={{ color: "var(--text)" }}>{deleteTarget.full_name}</strong>?
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-4)" }}>
            This action is permanent and cannot be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn-danger flex-1" onClick={handleDelete} id="confirm-delete-btn">
              Delete contact
            </button>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
