import { AtlasIcon } from "@/components/career/AtlasIcon";
import type { AtlasOrbState } from "./workspaceTypes";

export function AtlasOrb({
  state = "idle",
  size = "default",
}: {
  state?: AtlasOrbState;
  size?: "compact" | "default";
}) {
  const label = state === "processing"
    ? "Atlas is thinking"
    : state === "streaming"
      ? "Atlas is responding"
      : state === "error"
        ? "Atlas needs attention"
        : "Atlas mentor";

  return (
    <div
      className={`relative isolate grid aspect-square place-items-center atlas-mark-${state} ${size === "compact" ? "w-10" : "mx-auto w-36"}`}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true" className="atlas-orbit-ring">
        <span className="atlas-orbit-particle" />
      </span>
      <span aria-hidden="true" className="atlas-orbit-ring atlas-orbit-ring-tilted">
        <span className="atlas-orbit-particle" />
      </span>
      <span aria-hidden="true" className="atlas-orbit-ring inset-[-22%] opacity-50">
        <span className="atlas-orbit-particle" />
      </span>
      <div className={`relative z-10 grid place-items-center rounded-full border border-atlas-border bg-atlas-surface shadow-[0_0_30px_hsl(var(--atlas-accent)/0.1)] ${size === "compact" ? "h-8 w-8" : "h-20 w-20"}`}>
        <AtlasIcon className={`atlas-mark-logo ${size === "compact" ? "h-5 w-5" : "h-14 w-14"}`} />
      </div>
    </div>
  );
}
