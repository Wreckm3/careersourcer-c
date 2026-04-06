import { useState } from "react";
import { AlertCircle } from "lucide-react";

interface VideoEmbedProps {
  url: string;
  title: string;
  onSkip?: () => void;
}

export function VideoEmbed({ url, title, onSkip }: VideoEmbedProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="w-full aspect-video rounded-xl bg-muted flex flex-col items-center justify-center gap-4 border border-border">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">This resource is unavailable.</p>
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-transform duration-200 hover:scale-[1.03]"
          >
            Skip & Continue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-muted border border-border">
      <iframe
        src={url}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setError(true)}
      />
    </div>
  );
}
