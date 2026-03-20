"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { consumeFlashMessage } from "@/lib/flash-message";

export function FlashToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const flashMessage = consumeFlashMessage();
    if (!flashMessage) return;

    setMessage(flashMessage);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
    }, 2500);
  }, [pathname]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[60] sm:inset-x-auto sm:right-6 sm:top-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-500/30 ring-1 ring-white/25">
        {message}
      </div>
    </div>
  );
}

