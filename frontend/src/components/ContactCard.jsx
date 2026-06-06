import {
  PhoneIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import Avatar from "./Avatar";

export default function ContactCard({ contact, onView, onEdit, onDelete, onToggleFavorite }) {
  const { id, full_name, phone_number, alternate_number, email, is_favorite, is_emergency } = contact;

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 row-hover animate-fade-in cursor-pointer"
      onClick={() => onView && onView(contact)}
      id={`contact-${id}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar name={full_name} size="md" />
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {full_name}
          </span>
          {is_emergency && (
            <span className="badge-emergency">
              <ExclamationTriangleIcon className="w-2.5 h-2.5" />
              Emergency
            </span>
          )}
          {is_favorite && (
            <span className="badge-favorite">
              <StarSolid className="w-2.5 h-2.5" />
              Favorite
            </span>
          )}
        </div>
        {/* Phone visible on mobile */}
        <div className="md:hidden mt-0.5 flex items-center gap-1.5">
          <span className="text-xs truncate" style={{ color: "var(--text-3)" }}>
            {phone_number}
          </span>
        </div>
      </div>

      {/* Phone & Email — desktop columns */}
      <div className="hidden md:flex flex-[2] items-center gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <a
            href={`tel:${phone_number}`}
            className="text-sm truncate block transition-colors hover:text-brand-600"
            style={{ color: "var(--text-2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {phone_number}
          </a>
          {alternate_number && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-4)" }}>
              {alternate_number}
            </p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {email ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-4)" }} />
              <span className="text-sm truncate" style={{ color: "var(--text-3)" }}>{email}</span>
            </div>
          ) : (
            <span className="text-sm" style={{ color: "var(--text-4)" }}>—</span>
          )}
        </div>
      </div>

      {/* Actions — always visible */}
      <div className="flex items-center gap-1">
        <a
          href={`tel:${phone_number}`}
          className="btn-icon"
          title={`Call ${full_name}`}
          style={{ color: "#16a34a" }}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(22,163,74,.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
        >
          <PhoneIcon className="w-4 h-4" strokeWidth={2} />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(contact); }}
          className="btn-icon"
          title={is_favorite ? "Remove favorite" : "Add to favorites"}
          style={{ color: is_favorite ? "#d97706" : undefined }}
        >
          {is_favorite
            ? <StarSolid className="w-4 h-4" />
            : <StarIcon className="w-4 h-4" strokeWidth={2} />
          }
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(contact); }}
          className="btn-icon"
          title="Edit contact"
        >
          <PencilSquareIcon className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(contact); }}
          className="btn-icon"
          title="Delete contact"
          style={{ color: "#ef4444" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
        >
          <TrashIcon className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Mobile quick call */}
      <a
        href={`tel:${phone_number}`}
        className="md:hidden btn-icon flex-shrink-0"
        title={`Call ${full_name}`}
        style={{ color: "#16a34a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <PhoneIcon className="w-4.5 h-4.5" strokeWidth={2} />
      </a>
    </div>
  );
}
