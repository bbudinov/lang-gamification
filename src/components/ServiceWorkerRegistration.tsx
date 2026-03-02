"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // Check for updates immediately
        registration.update();

        // Also check for updates every 60 seconds
        const interval = setInterval(() => registration.update(), 60000);

        // When a new SW is found, activate it immediately
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.onstatechange = () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — tell it to activate
              newWorker.postMessage("SKIP_WAITING");
            }
          };
        };

        // When the new SW takes over, reload to get fresh assets
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        return () => clearInterval(interval);
      })
      .catch((err) => console.log("SW registration failed:", err));

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
