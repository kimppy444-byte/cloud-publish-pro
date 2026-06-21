import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import HomePage from "./HomePage";
import { posts } from "@/content/posts";

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:category" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("HomePage (visual-regression guard)", () => {
  it("renders the right-side 'This week on Creator Cloud' panel on the home hero — prevents the empty-right-half regression", () => {
    renderAt("/");
    expect(screen.getByText(/this week on creator cloud/i)).toBeInTheDocument();
  });

  it("the weekly panel lists at least 3 recent posts with links", () => {
    const { container } = renderAt("/");
    const panelHeading = screen.getByText(/this week on creator cloud/i);
    const panel = panelHeading.closest("div");
    expect(panel).not.toBeNull();
    const links = panel?.querySelectorAll('a[href^="/blog/"]') ?? [];
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the Editor's Picks rail on home (only when not filtering)", () => {
    renderAt("/");
    expect(screen.getByText(/editor's picks/i)).toBeInTheDocument();
  });

  it("thin categories (e.g. TikTok with 1 post) still show a 'More from Creator Cloud' rail — prevents the empty-page regression", () => {
    const tiktokCount = posts.filter((p) => p.category === "TikTok").length;
    // Test only meaningful while TikTok category is thin; if you add many TikTok posts, drop this guard.
    if (tiktokCount >= 4) return;
    renderAt("/category/tiktok");
    expect(screen.getByText(/more from creator cloud/i)).toBeInTheDocument();
  });

  it("category hero also gets the weekly panel — no empty-right-half on category pages", () => {
    renderAt("/category/monetization");
    expect(screen.getByText(/this week on creator cloud/i)).toBeInTheDocument();
  });
});
