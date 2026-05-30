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

export default function Emergency() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);

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

          {/* Idle state */}
          {!searched && (
            <div
              className="flex flex-col items-center justify-center py-20 select-none animate-fade-in"
              style={{ color: "var(--text-4)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "var(--surface-2)" }}
              >
                <PhoneIcon className="w-7 h-7" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-3)" }}>
                Ready to search
              </p>
              <p className="text-sm text-center max-w-xs">
                Type a name or phone number above to find contacts instantly
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
