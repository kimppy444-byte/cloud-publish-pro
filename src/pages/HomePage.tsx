import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { posts } from "@/content/posts";
import AdSlot from "@/components/AdSlot";
import { ArrowRight, Clock } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  monetization: "Monetization",
  tools: "Tools",
  analytics: "Analytics",
  growth: "Growth",
  newsletter: "Newsletter",
};

export default function HomePage() {
  const { category } = useParams();
  const [params] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase().trim();

  let visible = posts.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (category && CATEGORY_LABELS[category]) {
    visible = visible.filter((p) => p.category === CATEGORY_LABELS[category]);
  }
  if (q) {
    visible = visible.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
    );
  }

  // Only "feature" a post when we have enough to fill the grid below it
  const showFeatured = visible.length >= 4;
  const featured = showFeatured ? visible[0] : null;
  const rest = showFeatured ? visible.slice(1) : visible;

  // For thin category pages, show extra posts from the rest of the site
  const moreFromSite = category
    ? posts
        .filter((p) => p.category !== CATEGORY_LABELS[category!])
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 6)
    : [];

  const pageTitle = category
    ? `${CATEGORY_LABELS[category]} — Creator Cloud`
    : "Creator Cloud — Tools, Tips & Revenue for Modern Creators";
  const pageDesc = category
    ? `In-depth ${CATEGORY_LABELS[category]} articles, reviews, and growth playbooks for video and audio creators.`
    : "In-depth guides, software reviews, and revenue tactics for video creators, social-media managers, and indie tech founders.";

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={`https://cloud-publish-pro.lovable.app${category ? `/category/${category}` : "/"}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: pageTitle,
          description: pageDesc,
          url: `https://cloud-publish-pro.lovable.app${category ? `/category/${category}` : "/"}`,
          inLanguage: "en",
          isPartOf: { "@id": "https://cloud-publish-pro.lovable.app/#website" },
          publisher: { "@id": "https://cloud-publish-pro.lovable.app/#organization" },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: visible.length,
            itemListElement: visible.slice(0, 20).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://cloud-publish-pro.lovable.app/blog/${p.slug}`,
              name: p.title,
            })),
          },
        })}</script>
      </Helmet>

      <section className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase mb-3">
            {category ? CATEGORY_LABELS[category] : "Editorial"}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-3xl">
            {category ? CATEGORY_LABELS[category] : "Honest writing about the business of being a creator."}
          </h1>
          <p className="mt-4 text-gray-400 max-w-2xl">
            {category
              ? `Recent ${CATEGORY_LABELS[category]} coverage from the Creator Cloud editorial team.`
              : "We test the tools, run the math, and publish what actually works — no sponsored fluff, no recycled press releases."}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            className="block group mb-12 rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors"
          >
            <div className="p-6 md:p-10 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">
                Featured · {featured.category}
              </p>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight group-hover:text-white text-gray-100 mb-3">
                {featured.title}
              </h2>
              <p className="text-gray-400 max-w-2xl mb-4">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>By {featured.author}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {featured.readingMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 text-red-400 group-hover:gap-2 transition-all">
                  Read article <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        )}

        <AdSlot slot="1111111111" />

        {!category && !q && (() => {
          const editorPickSlugs = [
            "google-adsense-approval-checklist-2026",
            "brand-deal-negotiation-creator-rate-cards-2026",
            "llc-vs-sole-proprietor-for-creators-2026",
            "youtube-shorts-monetization-2026-realistic-rpm-breakdown",
            "best-keyword-research-tools-for-youtube-2026",
            "ai-thumbnail-generators-tested-2026",
          ];
          const picks = editorPickSlugs
            .map((s) => posts.find((p) => p.slug === s))
            .filter((p): p is NonNullable<typeof p> => Boolean(p));
          return (
            <section className="mt-12">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
                Editor's picks · highest-value reading
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {picks.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="group rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 p-5 hover:border-red-500/40 transition-colors"
                  >
                    <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400 mb-2 block">
                      {p.category}
                    </span>
                    <h4 className="font-semibold text-base leading-snug text-gray-100 group-hover:text-white mb-2">
                      {p.title}
                    </h4>
                    <span className="text-xs text-red-400 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4 mt-12">
          {category ? `${CATEGORY_LABELS[category!]} articles` : "Latest articles"}
        </h3>
        {rest.length === 0 ? (
          <p className="text-gray-500 text-sm mb-8">
            That's everything in this category for now — more coming soon.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p, i) => (
              <div key={p.slug} className="contents">
                <article className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5 flex flex-col">
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80 mb-2">
                    {p.category}
                  </span>
                  <h4 className="font-semibold text-lg leading-snug mb-2">
                    <Link to={`/blog/${p.slug}`} className="hover:text-white text-gray-100">
                      {p.title}
                    </Link>
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">{p.excerpt}</p>
                  <div className="text-xs text-gray-500 flex items-center justify-between">
                    <span>{p.author}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {p.readingMinutes} min
                    </span>
                  </div>
                </article>
                {(i + 1) % 6 === 0 && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <AdSlot slot="2222222222" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {category && moreFromSite.length > 0 && (
          <section className="mt-16">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
              More from Creator Cloud
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moreFromSite.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4"
                >
                  <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80 mb-2 block">
                    {p.category}
                  </span>
                  <h4 className="font-semibold text-sm leading-snug text-gray-100 group-hover:text-white">
                    {p.title}
                  </h4>
                </Link>
              ))}
            </div>
          </section>
        )}
              <article className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-5 flex flex-col">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-400/80 mb-2">
                  {p.category}
                </span>
                <h4 className="font-semibold text-lg leading-snug mb-2">
                  <Link to={`/blog/${p.slug}`} className="hover:text-white text-gray-100">
                    {p.title}
                  </Link>
                </h4>
                <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1">{p.excerpt}</p>
                <div className="text-xs text-gray-500 flex items-center justify-between">
                  <span>{p.author}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {p.readingMinutes} min
                  </span>
                </div>
              </article>
              {(i + 1) % 6 === 0 && (
                <div className="md:col-span-2 lg:col-span-3">
                  <AdSlot slot="2222222222" />
                </div>
              )}
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-center text-gray-500 py-16">
            No articles match that filter yet. Try the homepage.
          </p>
        )}
      </div>
    </>
  );
}
