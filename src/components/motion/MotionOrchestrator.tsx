"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// One global engine for scroll-reveal motion. Any server component opts an
// element in with `data-reveal` (optionally `data-reveal-delay="0.15"`).
//
// Fail-safe by design: nothing is hidden in CSS, and only elements that sit
// BELOW the viewport at hydration time are animated. If JS never loads, is
// slow, or the user prefers reduced motion, every element is simply visible —
// no flash, no stuck-invisible content. Above-fold entrances are handled by
// pure-CSS keyframes on the hero instead.
export default function MotionOrchestrator() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = gsap.utils
      .toArray<HTMLElement>("[data-reveal]")
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);

    const tweens = targets.map((el) => {
      const delay = parseFloat(el.dataset.revealDelay ?? "0");
      return gsap.fromTo(
        el,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          delay,
          ease: "expo.out",
          overwrite: "auto",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            once: true,
          },
        },
      );
    });

    // Re-measure once fonts/images settle so trigger positions stay accurate.
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);

    return () => {
      clearTimeout(t);
      tweens.forEach((tw) => {
        tw.scrollTrigger?.kill();
        tw.kill();
      });
      gsap.set("[data-reveal]", { clearProps: "opacity,transform" });
    };
  }, [pathname]);

  return null;
}
