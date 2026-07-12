"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

// Wraps any element with a magnetic pull toward the cursor. Pointer-only —
// touch devices and reduced-motion users get a plain wrapper. Keep `strength`
// subtle (≤0.4): the effect should be felt, not noticed.
export default function MagneticButton({
  children,
  strength = 0.3,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const xTo = useRef<((v: number) => void) | null>(null);
  const yTo = useRef<((v: number) => void) | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !finePointer) return;
    xTo.current = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    yTo.current = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el || !xTo.current || !yTo.current) return;
      const r = el.getBoundingClientRect();
      xTo.current((e.clientX - (r.left + r.width / 2)) * strength);
      yTo.current((e.clientY - (r.top + r.height / 2)) * strength);
    },
    [strength],
  );

  const onLeave = useCallback(() => {
    xTo.current?.(0);
    yTo.current?.(0);
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`inline-block ${className}`}>
      {children}
    </div>
  );
}
