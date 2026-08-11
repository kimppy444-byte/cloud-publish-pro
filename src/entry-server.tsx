import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type FilledContext } from "react-helmet-async";
import App from "./App";
import { posts } from "./content/posts";

const staticRoutes = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/dmca",
  "/disclosure",
  "/editorial-policy",
  "/smart-links",
  "/social-media-glossary",
  "/how-it-works",
  "/pricing",
];

const categoryRoutes = ["youtube", "tiktok", "monetization", "tools", "analytics", "growth", "newsletter"]
  .map((category) => `/category/${category}`);

export const prerenderRoutes = [
  ...staticRoutes,
  ...categoryRoutes,
  ...posts.map((post) => `/blog/${post.slug}`),
];

export function render(url: string) {
  const helmetContext = {} as FilledContext;
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>,
  );

  return { html, helmet: helmetContext.helmet };
}