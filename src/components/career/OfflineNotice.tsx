import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineNotice() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-lg"
    >
      <WifiOff className="h-4 w-4 text-primary" />
      You are offline. Some actions will sync when your connection returns.
    </div>
  );
}
