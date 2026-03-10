"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { syncToCloud, syncFromCloud } from "@/lib/sync";

const SYNC_INTERVAL = 60_000; // Sync every 60 seconds

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const hasSynced = useRef(false);

  // Initial sync on login
  useEffect(() => {
    if (!initialized || !user) {
      hasSynced.current = false;
      return;
    }

    if (!hasSynced.current) {
      hasSynced.current = true;
      // Pull cloud data first, then push local
      syncFromCloud(user.id).then(() => syncToCloud(user.id)).catch(console.error);
    }
  }, [user, initialized]);

  // Periodic sync
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      syncToCloud(user.id).catch(console.error);
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [user]);

  // Sync before page unload
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable sync on close
      syncToCloud(user.id).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  return <>{children}</>;
}
