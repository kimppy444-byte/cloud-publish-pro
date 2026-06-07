import { useEffect, useRef } from "react";

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

interface AdSlotProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle";
  layout?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Google AdSense ad slot.
 * The publisher script is loaded once in index.html. Each slot pushes itself
 * onto the adsbygoogle queue on mount.
 */
export default function AdSlot({
  slot = "0000000000",
  format = "auto",
  layout,
  className = "",
  style,
}: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense not ready or blocked — silent */
    }
  }, []);

  return (
    <div className={`my-8 flex justify-center ${className}`}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90, width: "100%", ...style }}
        data-ad-client="ca-pub-8877213222492502"
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
      />
    </div>
  );
}
