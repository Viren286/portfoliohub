"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Renders a full-size website (default 1280px wide) inside a sandboxed iframe and
 * scales it to fit its container. Scripts may run (for animations) but the frame has
 * no same-origin access, so preview HTML can never touch the platform's session.
 */
export function ScaledFrame({
  html,
  title,
  baseWidth = 1280,
  aspect = 10 / 16,
  className = "",
  interactive = false,
}: {
  html: string;
  title: string;
  baseWidth?: number;
  aspect?: number;
  className?: string;
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / baseWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);
  const baseHeight = baseWidth * aspect;
  return (
    <div ref={ref} className={`relative w-full overflow-hidden ${className}`} style={{ aspectRatio: `${1 / aspect}` }}>
      <iframe
        title={title}
        srcDoc={html}
        sandbox="allow-scripts"
        loading="lazy"
        tabIndex={interactive ? 0 : -1}
        aria-hidden={interactive ? undefined : true}
        className="absolute left-0 top-0 origin-top-left border-0 bg-white"
        style={{ width: baseWidth, height: baseHeight, transform: `scale(${scale})`, pointerEvents: interactive ? "auto" : "none" }}
      />
    </div>
  );
}
