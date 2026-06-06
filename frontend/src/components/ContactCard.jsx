import { PhoneIcon, PencilIcon, TrashIcon, StarIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

/* Deterministic colour per contact — same palette as Avatar */
const PALETTE = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759",
  "#00C7BE", "#30B0C7", "#32ADE6", "#007AFF",
  "#5856D6", "#AF52DE", "#FF2D55", "#A2845E",
];
function colorFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function ContactCard({ contact, onView, onEdit, onDelete, onToggleFavorite }) {
  const { id, full_name, phone_number, email, is_favorite, is_emergency } = contact;
  const color = colorFor(full_name);

  return (
    <div
      id={`contact-${id}`}
      onClick={() => onView && onView(contact)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "10px 16px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "background 0.12s",
        WebkitTapHighlightColor: "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
    >
      {/* ── Avatar ─────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "17px",
          fontWeight: "600",
          letterSpacing: "-0.5px",
          userSelect: "none",
        }}
      >
        {initials(full_name) || "?"}
      </div>

      {/* ── Name + phone ────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "16px",
              fontWeight: "400",
              color: "var(--text)",
              letterSpacing: "-0.2px",
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "180px",
            }}
          >
            {full_name}
          </span>
          {is_emergency && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: "#ff3b30",
                background: "rgba(255,59,48,0.1)",
                borderRadius: "4px",
                padding: "1px 5px",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              SOS
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-3)",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {phone_number}
        </div>
      </div>

      {/* ── Action buttons — always visible ─────────────────────── */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Call */}
        <a
          href={`tel:${phone_number}`}
          title={`Call ${full_name}`}
          style={btnStyle("#34c759", "rgba(52,199,89,0.12)")}
        >
          <PhoneIcon style={{ width: "15px", height: "15px" }} />
        </a>

        {/* Favourite */}
        <button
          onClick={() => onToggleFavorite(contact)}
          title={is_favorite ? "Remove favourite" : "Add to favourites"}
          style={btnStyle(
            is_favorite ? "#ff9500" : "var(--text-3)",
            is_favorite ? "rgba(255,149,0,0.12)" : "transparent"
          )}
        >
          {is_favorite
            ? <StarIcon    style={{ width: "15px", height: "15px" }} />
            : <StarOutline style={{ width: "15px", height: "15px", strokeWidth: 2 }} />}
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(contact)}
          title="Edit contact"
          style={btnStyle("var(--brand)", "rgba(0,122,255,0.1)")}
        >
          <PencilIcon style={{ width: "14px", height: "14px" }} />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(contact)}
          title="Delete contact"
          style={btnStyle("#ff3b30", "rgba(255,59,48,0.1)")}
        >
          <TrashIcon style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* ── Chevron (iOS style) ─────────────────────────────────── */}
      <svg
        width="7" height="12" viewBox="0 0 7 12" fill="none"
        style={{ flexShrink: 0, opacity: 0.3, marginLeft: "2px" }}
      >
        <path d="M1 1l5 5-5 5" stroke="var(--text)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* Shared action button style */
function btnStyle(color, bg) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: bg,
    color: color,
    textDecoration: "none",
    flexShrink: 0,
    transition: "opacity 0.12s",
  };
}
