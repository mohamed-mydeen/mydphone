import { useState, useEffect, useMemo } from "react";
import { PlusIcon, ArrowDownTrayIcon, UsersIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import api from "../api/axios";
import ContactCard from "../components/ContactCard";
import ContactForm from "../components/ContactForm";
import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import EmptyState from "../components/EmptyState";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/LoadingSpinner";

const FILTERS = [
  { label: "All contacts", value: "all" },
  { label: "Favorites",    value: "favorite" },
  { label: "Emergency",    value: "emergency" },
];

export default function Contacts() {
  const [contacts, setContacts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [query, setQuery]               = useState("");
  const [filter, setFilter]             = useState("all");
  const [saving, setSaving]             = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [viewTarget, setViewTarget]     = useState(null);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 1. Instantly load from secure session storage (Fast Access)
  // 2. Fetch fresh from server (Background sync)
  useEffect(() => {
    const cached = sessionStorage.getItem("secure_vault_contacts");
    if (cached) {
      try {
        setContacts(JSON.parse(cached));
        setLoading(false);
      } catch (e) {
        sessionStorage.removeItem("secure_vault_contacts");
      }
    }

    const fetchAllContacts = async () => {
      try {
        const res = await api.get("/contacts/all");
        setContacts(res.data);
        sessionStorage.setItem("secure_vault_contacts", JSON.stringify(res.data));
      } catch (err) {
        if (!cached) toast.error("Failed to load contacts");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllContacts();
  }, []);

  const updateCache = (newList) => {
    setContacts(newList);
    sessionStorage.setItem("secure_vault_contacts", JSON.stringify(newList));
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editTarget) {
        const res = await api.put(`/contacts/${editTarget.id}`, payload);
        const updated = contacts.map(c => c.id === editTarget.id ? res.data : c);
        updateCache(updated);
        toast.success("Contact updated");
      } else {
        const res = await api.post("/contacts", payload);
        const updated = [...contacts, res.data].sort((a, b) => a.full_name.localeCompare(b.full_name));
        updateCache(updated);
        toast.success("Contact added");
      }
      setShowForm(false);
      setEditTarget(null);
      setQuery("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/contacts/${deleteTarget.id}`);
      const updated = contacts.filter(c => c.id !== deleteTarget.id);
      updateCache(updated);
      toast.success("Contact deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleFavorite = async (contact) => {
    try {
      const res = await api.put(`/contacts/${contact.id}`, { is_favorite: !contact.is_favorite });
      const updated = contacts.map(c => c.id === contact.id ? res.data : c);
      updateCache(updated);
    } catch {
      toast.error("Update failed");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/contacts/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "contacts.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Contacts exported");
    } catch {
      toast.error("Export failed");
    }
  };

  // Client-side filtering & searching (Instant)
  const displayed = useMemo(() => {
    let list = contacts;
    
    if (filter === "favorite") list = list.filter(c => c.is_favorite);
    if (filter === "emergency") list = list.filter(c => c.is_emergency);
    
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.phone_number && c.phone_number.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [contacts, filter, query]);

  const isSearching = !!query.trim();

  // Group alphabetically
  const grouped = useMemo(() => {
    return displayed.reduce((acc, c) => {
      const l = c.full_name[0]?.toUpperCase() ?? "#";
      if (!acc[l]) acc[l] = [];
      acc[l].push(c);
      return acc;
    }, {});
  }, [displayed]);
  const letters = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content max-w-3xl">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Contacts</h1>
              {!isSearching && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-4)" }}>
                  {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExport} className="btn-secondary gap-1.5 text-xs px-3 py-2" title="Export as CSV">
                <ArrowDownTrayIcon className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={() => { setEditTarget(null); setShowForm(true); }} className="btn-primary gap-1.5 text-xs px-3 py-2">
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
                    onClick={() => setFilter(f.value)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 transition-all duration-100"
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

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="w-6 h-6" strokeWidth={1.5} />}
              title={isSearching ? "No results found" : "No contacts yet"}
              description={isSearching ? `No contacts match "${query}".` : "Add your first contact to get started."}
              action={!isSearching && (
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                  <PlusIcon className="w-4 h-4" /> Add contact
                </button>
              )}
            />
          ) : (
            <div className="card overflow-hidden animate-fade-in" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
              {isSearching ? (
                <div>
                  {displayed.map((c, i) => (
                    <div key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <ContactCard contact={c} onView={setViewTarget} onEdit={(c) => { setEditTarget(c); setShowForm(true); }} onDelete={setDeleteTarget} onToggleFavorite={toggleFavorite} />
                    </div>
                  ))}
                </div>
              ) : (
                letters.map((letter) => (
                  <div key={letter}>
                    <div className="px-5 py-1.5 font-bold" style={{ background: "var(--surface-2)", color: "var(--text-3)", fontSize: 13, borderBottom: "1px solid var(--border)" }}>
                      {letter}
                    </div>
                    {grouped[letter].map((c, i) => (
                      <div key={c.id}>
                        <ContactCard contact={c} onView={setViewTarget} onEdit={(c) => { setEditTarget(c); setShowForm(true); }} onDelete={setDeleteTarget} onToggleFavorite={toggleFavorite} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editTarget ? "Edit Contact" : "New Contact"} onClose={() => { setShowForm(false); setEditTarget(null); }}>
          <ContactForm initial={editTarget} onSave={handleSave} onCancel={() => { setShowForm(false); setEditTarget(null); }} loading={saving} />
        </Modal>
      )}

      {/* View Modal */}
      {viewTarget && (
        <Modal title="Contact Details" onClose={() => setViewTarget(null)}>
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 mb-4 rounded-full flex items-center justify-center text-3xl font-semibold" style={{ background: "var(--brand-l2)", color: "var(--brand)" }}>
              {viewTarget.full_name[0]?.toUpperCase() || "#"}
            </div>
            <h2 className="text-xl font-bold text-center mb-2" style={{ color: "var(--text)" }}>{viewTarget.full_name}</h2>
          </div>
          <div className="space-y-4 mb-6">
            {viewTarget.phone_number && (
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: "var(--surface-2)" }}>
                <div><p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Primary Phone</p><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{viewTarget.phone_number}</p></div>
                <a href={`tel:${viewTarget.phone_number}`} className="btn-icon" style={{ color: "#16a34a", background: "rgba(22,163,74,.08)" }}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg></a>
              </div>
            )}
            {viewTarget.alternate_number && (
              <div className="p-3 rounded-lg flex justify-between items-center" style={{ background: "var(--surface-2)" }}>
                <div><p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-4)" }}>Alternate Phone</p><p className="text-sm font-medium" style={{ color: "var(--text)" }}>{viewTarget.alternate_number}</p></div>
                <a href={`tel:${viewTarget.alternate_number}`} className="btn-icon" style={{ color: "#16a34a", background: "rgba(22,163,74,.08)" }}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-4.18-7.076-7.076l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg></a>
              </div>
            )}
          </div>
          <div className="flex gap-2.5">
            <button className="btn-primary flex-1" onClick={() => { setEditTarget(viewTarget); setViewTarget(null); setShowForm(true); }}>Edit contact</button>
            <button className="btn-secondary" onClick={() => setViewTarget(null)}>Close</button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete contact" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm mb-1" style={{ color: "var(--text-2)" }}>Delete <strong style={{ color: "var(--text)" }}>{deleteTarget.full_name}</strong>?</p>
          <div className="flex gap-2.5 mt-6">
            <button className="btn-danger flex-1" onClick={handleDelete}>Delete</button>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
