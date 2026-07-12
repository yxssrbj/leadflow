"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";

// Branded entrance: logo mark + wordmark + a bar sweep, ~1s total, then the
// veil splits away. Plays once per browser session (sessionStorage), never on
// reduced motion, and never blocks — content renders underneath from frame 0.
export default function Preloader() {
  const [show, setShow] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Deferred one frame so the state change isn't synchronous inside the
    // effect body (react-hooks/set-state-in-effect).
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || sessionStorage.getItem("lf-intro-done")) {
        setGone(true);
        return;
      }
      sessionStorage.setItem("lf-intro-done", "1");
      setShow(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!show) return;
    const tl = gsap.timeline({
      onComplete: () => setGone(true),
    });
    tl.fromTo(".lf-pre-mark", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" })
      .fromTo(
        ".lf-pre-word",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" },
        "-=0.25",
      )
      .fromTo(".lf-pre-bar", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, "-=0.2")
      .to(".lf-pre-inner", { opacity: 0, y: -10, duration: 0.3, ease: "power2.in" }, "+=0.1")
      .to(".lf-preloader", { yPercent: -100, duration: 0.55, ease: "expo.inOut" }, "-=0.05");
    return () => {
      tl.kill();
    };
  }, [show]);

  if (gone || !show) return null;

  return (
    <div
      aria-hidden
      className="lf-preloader fixed inset-0 z-[100] flex items-center justify-center bg-ink-950"
    >
      <div className="lf-pre-inner flex flex-col items-center gap-5">
        <span className="lf-pre-mark flex h-14 w-14 items-center justify-center rounded-2xl bg-ember text-2xl font-black text-white glow-ember">
          L
        </span>
        <p className="lf-pre-word font-display text-lg font-semibold tracking-[0.35em] text-hi uppercase">
          LeadFlow
        </p>
        <span className="lf-pre-bar block h-px w-40 origin-left bg-ember-500" />
      </div>
    </div>
  );
}
