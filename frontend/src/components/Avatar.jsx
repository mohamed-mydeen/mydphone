const PALETTE = [
  { bg: "#e0e7ff", fg: "#3730a3" },
  { bg: "#fce7f3", fg: "#9d174d" },
  { bg: "#d1fae5", fg: "#065f46" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#dbeafe", fg: "#1e40af" },
  { bg: "#ede9fe", fg: "#5b21b6" },
  { bg: "#ffedd5", fg: "#9a3412" },
  { bg: "#ccfbf1", fg: "#134e4a" },
  { bg: "#fae8ff", fg: "#701a75" },
  { bg: "#ecfccb", fg: "#3f6212" },
];

function colorFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function Avatar({ name = "", size = "md", className = "" }) {
  const { bg, fg } = colorFor(name);
  const sizeClass = size === "sm" ? "avatar-sm" : size === "lg" ? "avatar-lg" : "avatar-md";
  return (
    <span
      className={`${sizeClass} ${className}`}
      style={{ background: bg, color: fg }}
      aria-label={name}
    >
      {initials(name) || "?"}
    </span>
  );
}
