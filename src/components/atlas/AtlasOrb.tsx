import { AtlasIcon } from "@/components/career/AtlasIcon";
import type { AtlasOrbState } from "./workspaceTypes";

export function AtlasOrb({ state = "idle" }: { state?: AtlasOrbState }) {
  return (
    <div
      className={`relative isolate mx-auto grid aspect-square w-36 place-items-center atlas-mark-${state}`}
      role="img"
      aria-label={state === "processing" ? "Atlas is thinking" : "Atlas mentor"}
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
      <div className="relative z-10 grid h-20 w-20 place-items-center rounded-full border border-atlas-border bg-atlas-surface shadow-[0_0_30px_hsl(var(--atlas-accent)/0.1)]">
        <AtlasIcon className="atlas-mark-logo h-14 w-14" />
      </div>
    </div>
  );
}