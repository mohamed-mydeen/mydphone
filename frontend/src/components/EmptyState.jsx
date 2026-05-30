export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 select-none animate-fade-in">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--surface-2)", color: "var(--text-4)" }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-2)" }}>
        {title}
      </h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-4)" }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
