interface AtlasIconProps {
  className?: string;
}

/** Atlas-only brand mark. The image is decorative where the surrounding UI names Atlas. */
export function AtlasIcon({ className = "" }: AtlasIconProps) {
  return (
    <img
      src="/atlas-icon.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 rounded-[22%] object-contain shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${className}`}
    />
  );
}
