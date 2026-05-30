export default function LoadingSpinner({ size = "md" }) {
  const s = size === "sm" ? "w-4 h-4 border-[2px]" : size === "lg" ? "w-8 h-8 border-[3px]" : "w-5 h-5 border-2";
  return (
    <span
      className={`${s} rounded-full border-current border-t-transparent animate-spin inline-block`}
      role="status"
      aria-label="Loading"
    />
  );
}
