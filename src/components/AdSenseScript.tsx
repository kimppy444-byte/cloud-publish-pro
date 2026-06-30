import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Route-aware AdSense loader.
 *
 * We deliberately DO NOT load the AdSense script on bridge/unlock/admin routes.
 * Those pages are intentionally thin (they redirect or gate access) and if the
 * AdSense crawler associates our publisher ID with them, it flags the whole
 * site as "Low value content / thin content / doorway pages" — which is
 * exactly what happened on the first review.
 *
 * Only editorial routes (/, /blog/*, /category/*, legal pages) load the script.
 */
const BLOCKED_PREFIXES = ["/u/", "/s/", "/article/", "/admin", "/youtube-callback"];

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8877213222492502";

export default function AdSenseScript() {
  const { pathname } = useLocation();
  const blocked = BLOCKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  useEffect(() => {
    if (blocked) return;
    if (document.querySelector(`script[src^="${ADSENSE_SRC.split("?")[0]}"]`)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = ADSENSE_SRC;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }, [blocked]);

  return null;
}
