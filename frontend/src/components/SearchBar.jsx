import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SearchBar({ value, onChange, onClear, placeholder = "Search contacts…", autoFocus = false }) {
  return (
    <div className="relative w-full">
      <MagnifyingGlassIcon
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--text-4)" }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input pl-10 pr-9"
        id="global-search"
        aria-label="Search contacts"
        style={{ borderRadius: "var(--radius-md)" }}
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon p-0.5"
          aria-label="Clear search"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
