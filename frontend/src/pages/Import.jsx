import { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import Navbar from "../components/Navbar";

/* ─── Google Contacts CSV parser (runs entirely in browser) ─── */
function parseCSV(text) {
  const lines = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (ch === "\n" && !inQ) { lines.push(cur); cur = ""; }
    else { cur += ch; }
  }
  if (cur) lines.push(cur);

  const parseRow = (line) => {
    const cells = []; let cell = "", inQ2 = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ2 = !inQ2; }
      else if (ch === "," && !inQ2) { cells.push(cell.trim()); cell = ""; }
      else { cell += ch; }
    }
    cells.push(cell.trim());
    return cells;
  };

  const headers = parseRow(lines[0] || "").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseRow(lines[i]).map(v => v.replace(/^"|"$/g, "").trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ""; });
    rows.push(obj);
  }
  return rows;
}

function g(row, ...keys) {
  for (const k of keys) {
    const v = (row[k] || "").trim();
    if (v) return v;
  }
  return "";
}

function extractContact(row) {
  // Name — native or Google
  let name = g(row, "full_name", "Name");
  if (!name) {
    const first  = g(row, "First Name");
    const middle = g(row, "Middle Name");
    const last   = g(row, "Last Name");
    name = [first, middle, last].filter(Boolean).join(" ");
  }

  // Primary phone
  let phone = g(row, "phone_number", "Phone 1 - Value", "Phone 2 - Value", "Phone 3 - Value");

  // Alternate phone
  let alt = g(row, "alternate_number");
  if (!alt && phone) {
    const p2 = g(row, "Phone 2 - Value");
    const p3 = g(row, "Phone 3 - Value");
    if (phone !== p2) alt = p2 || p3;
  }

  // Email
  const email = g(row, "email", "E-mail 1 - Value", "E-mail 2 - Value");
  // Address
  const address = g(row, "address", "Address 1 - Formatted");
  // Notes
  const notes = g(row, "notes", "Notes");

  return { name, phone, alt: alt || null, email: email || null, address: address || null, notes: notes || null };
}

function isValidPhone(p) {
  return p && /\d{6,}/.test(p.replace(/[^\d]/g, ""));
}

/* ─── Main Component ─── */
export default function Import() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null); // parsed contacts before import
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState({ done: 0, total: 0 });
  const [result, setResult]       = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput]     = useState("");
  const inputRef = useRef();
  const abortRef = useRef(false);

  /* ── Password gate ── */
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.trim() === "myd@4262") setIsAuthenticated(true);
    else toast.error("Incorrect password");
  };

  /* ── File selection → parse immediately in browser ── */
  const handleFile = (f) => {
    if (!f?.name.endsWith(".csv")) { toast.error("Please select a .csv file"); return; }
    setFile(f);
    setResult(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        const contacts = [];
        const skipped  = [];

        rows.forEach((row, i) => {
          const { name, phone, alt, email, address, notes } = extractContact(row);
          if (!name)             { skipped.push(`Row ${i + 2}: No name`); return; }
          if (!isValidPhone(phone)) { skipped.push(`Row ${i + 2} (${name}): No valid phone`); return; }
          contacts.push({ full_name: name, phone_number: phone, alternate_number: alt, email, address, notes, is_favorite: false, is_emergency: false });
        });

        setPreview({ contacts, skipped });
        if (contacts.length === 0) toast.error("No valid contacts found in this file");
        else toast.success(`Found ${contacts.length} valid contacts — review and import`);
      } catch (err) {
        toast.error("Could not read the CSV file: " + err.message);
      }
    };
    reader.readAsText(f, "UTF-8");
  };

  /* ── Import: send each contact via existing POST /contacts ── */
  const handleImport = async () => {
    if (!preview?.contacts?.length) return;
    setImporting(true);
    abortRef.current = false;
    const total = preview.contacts.length;
    setProgress({ done: 0, total });
    setResult(null);

    let imported = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < preview.contacts.length; i++) {
      if (abortRef.current) { errors.push("Import cancelled by user."); break; }
      const c = preview.contacts[i];
      try {
        await api.post("/contacts", c);
        imported++;
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || "Unknown error";
        errors.push(`${c.full_name}: ${msg}`);
        skipped++;
      }
      setProgress({ done: i + 1, total });
    }

    setResult({ imported, skipped, errors });
    setImporting(false);
    setPreview(null);
    setFile(null);
    if (imported > 0) toast.success(`${imported} contacts imported!`);
    else toast.error("No contacts were imported");
  };

  /* ── Password screen ── */
  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <Navbar />
        <div className="page-body">
          <div className="page-content" style={{ maxWidth: 420, margin: "0 auto" }}>
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>Access Restricted</h2>
              <p className="text-sm mb-5" style={{ color: "var(--text-3)" }}>Enter the password to access Import.</p>
              <form onSubmit={handlePasswordSubmit}>
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password" className="input mb-3" autoFocus />
                <button type="submit" className="btn-primary w-full py-2.5">Unlock</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <div className="page-content" style={{ maxWidth: 680 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>Import Contacts</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-4)" }}>
              Supports Google Contacts export (.csv) and native format
            </p>
          </div>

          {/* Step 1 — Drop zone */}
          {!preview && !importing && !result && (
            <>
              <div
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current.click()}
                id="csv-drop-zone"
                style={{
                  minHeight: 200,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 12, textAlign: "center", cursor: "pointer",
                  border: `2px dashed ${dragging ? "var(--brand)" : "var(--border-2)"}`,
                  borderRadius: 16,
                  background: dragging ? "var(--brand-l)" : "var(--surface)",
                  padding: "32px 24px",
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: dragging ? "var(--brand-l2)" : "var(--surface-2)",
                  color: dragging ? "var(--brand)" : "var(--text-4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ArrowUpTrayIcon style={{ width: 22, height: 22 }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)" }}>
                    {file ? file.name : "Drop your Google Contacts CSV here"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 4 }}>
                    or <span style={{ color: "var(--brand)", fontWeight: 600 }}>browse files</span> — .csv only
                  </p>
                </div>
                <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} id="csv-file-input"
                  onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
              </div>

              {/* How to export tip */}
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 10,
                background: "var(--surface-2)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 4 }}>
                  📲 How to export from Google Contacts
                </p>
                <p style={{ fontSize: 12, color: "var(--text-4)", lineHeight: 1.6 }}>
                  Open <strong>contacts.google.com</strong> → Click the export icon (↑) or go to{" "}
                  <strong>More → Export</strong> → Choose <strong>Google CSV</strong> → Download
                </p>
              </div>
            </>
          )}

          {/* Step 2 — Preview parsed contacts */}
          {preview && !importing && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UserGroupIcon style={{ width: 16, height: 16, color: "var(--brand)" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {preview.contacts.length} contacts ready to import
                  </span>
                  {preview.skipped.length > 0 && (
                    <span style={{ fontSize: 12, color: "#ff9500" }}>
                      ({preview.skipped.length} will be skipped)
                    </span>
                  )}
                </div>
                <button onClick={() => { setPreview(null); setFile(null); }}
                  style={{ fontSize: 12, color: "var(--text-4)", background: "none", border: "none", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              {/* Preview list — first 10 */}
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {preview.contacts.slice(0, 10).map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 18px", borderBottom: "1px solid var(--border)",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--brand-l2)", color: "var(--brand)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                    }}>
                      {c.full_name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", margin: 0 }}>{c.full_name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{c.phone_number}</p>
                    </div>
                  </div>
                ))}
                {preview.contacts.length > 10 && (
                  <p style={{ textAlign: "center", padding: "10px", fontSize: 12, color: "var(--text-4)" }}>
                    +{preview.contacts.length - 10} more contacts…
                  </p>
                )}
              </div>

              {/* Skipped rows */}
              {preview.skipped.length > 0 && (
                <div style={{
                  margin: "0 18px 12px", padding: "10px 12px", borderRadius: 8,
                  background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)",
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#ff9500", marginBottom: 4 }}>Rows that will be skipped:</p>
                  {preview.skipped.slice(0, 5).map((s, i) => (
                    <p key={i} style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>• {s}</p>
                  ))}
                  {preview.skipped.length > 5 && (
                    <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>+{preview.skipped.length - 5} more…</p>
                  )}
                </div>
              )}

              <div style={{ padding: "14px 18px" }}>
                <button className="btn-primary w-full py-2.5" onClick={handleImport} id="import-upload-btn">
                  Import {preview.contacts.length} contacts
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Progress bar */}
          {importing && (
            <div className="card p-6" style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                Importing… {progress.done} / {progress.total}
              </p>
              <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden", margin: "12px 0" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: "var(--brand)",
                  width: `${pct}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-4)" }}>{pct}% complete — do not close this page</p>
              <button onClick={() => { abortRef.current = true; }}
                style={{ marginTop: 16, fontSize: 12, color: "#ff3b30", background: "none", border: "none", cursor: "pointer" }}>
                Stop import
              </button>
            </div>
          )}

          {/* Step 4 — Result */}
          {result && (
            <div className="card p-5">
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Import complete</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(52,199,89,0.1)", color: "#34c759", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircleIcon style={{ width: 18, height: 18 }} />
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text)" }}>
                    <strong>{result.imported}</strong> contact{result.imported !== 1 ? "s" : ""} imported
                  </p>
                </div>
                {result.skipped > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,149,0,0.1)", color: "#ff9500", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <XCircleIcon style={{ width: 18, height: 18 }} />
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-3)" }}>
                      <strong>{result.skipped}</strong> skipped (duplicates or errors)
                    </p>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,149,0,0.06)", border: "1px solid rgba(255,149,0,0.2)" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#ff9500", marginBottom: 4 }}>Details:</p>
                    {result.errors.slice(0, 10).map((e, i) => (
                      <p key={i} style={{ fontSize: 11, color: "var(--text-3)", margin: 0 }}>• {e}</p>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <Link to="/contacts" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  View contacts <ArrowRightIcon style={{ width: 14, height: 14 }} />
                </Link>
                <button className="btn-secondary" style={{ fontSize: 13 }}
                  onClick={() => { setResult(null); setFile(null); }}>
                  Import more
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
