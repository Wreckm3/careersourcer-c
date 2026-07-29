import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { isEnabled } from "@/config/features";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Install button. Only visible after Chrome/Edge fires
 * `beforeinstallprompt` (Android + desktop Chromium). iOS Safari has
 * no programmatic install prompt — users add to home screen from the
 * share sheet; we intentionally do not show a fake button for iOS.
 */
export function InstallPWA({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!isEnabled("pwaInstallPrompt")) return;

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <button
      type="button"
      onClick={install}
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors ${className}`}
      aria-label="Install CareerSourcer as an app"
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      Install CareerSourcer
    </button>
  );
}
