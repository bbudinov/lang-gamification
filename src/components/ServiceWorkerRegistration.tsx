"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW registration failed:", err));
    }

    // Prevent Android back button from exiting the PWA
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };

    // Push initial state so there's always something to "go back" to
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("popstate", preventBack);
    return () => window.removeEventListener("popstate", preventBack);
  }, []);

  return null;
}
