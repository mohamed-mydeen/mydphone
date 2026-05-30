import { useEffect, useRef } from "react";

/**
 * PageTransition — wraps a route's content with a smooth
 * enter animation every time the route key changes.
 * Uses a CSS keyframe defined in index.css (animate-page-enter).
 */
export default function PageTransition({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reset and replay animation
    el.style.animation = "none";
    // Force reflow
    void el.offsetHeight;
    el.style.animation = "";
  }, []);

  return (
    <div 
      ref={ref} 
      className="animate-page-enter" 
      style={{ minHeight: "inherit" }}
      onAnimationEnd={(e) => {
        e.currentTarget.classList.remove('animate-page-enter');
      }}
    >
      {children}
    </div>
  );
}
