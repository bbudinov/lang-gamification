let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    // Wake Lock request failed (e.g. low battery)
  }
}

export function releaseWakeLock(): void {
  wakeLock?.release();
  wakeLock = null;
}
