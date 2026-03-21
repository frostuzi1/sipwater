"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD_PX = 280;
const SCROLL_DURATION_MS = 650;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function scrollToTopSmooth() {
  const startY = window.scrollY;
  if (startY <= 0) return;
  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, Math.round(startY * (1 - eased)));
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="back-to-top"
          type="button"
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          onClick={scrollToTopSmooth}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600 sm:bottom-6 sm:right-6"
          aria-label="Back to top"
        >
          <ChevronUp className="size-6" strokeWidth={2.5} aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
