"use client";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/** Fades content up once when it scrolls into view. Respects reduced motion via global CSS. */
export function Reveal({ children, as: Tag = "div", delay = 0, className = "" }: { children: ReactNode; as?: ElementType; delay?: number; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`${className} transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.7,.2,1)] ${shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
