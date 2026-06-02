import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import Index from "./pages/Index";
import UploadPage from "./pages/UploadPage";
import BulkUploadPage from "./pages/BulkUploadPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SocialPage from "./pages/SocialPage";
import SettingsPage from "./pages/SettingsPage";
import YouTubeCallbackPage from "./pages/YouTubeCallbackPage";
import MyVideosPage from "./pages/MyVideosPage";
import IgAutoReplyPage from "./pages/IgAutoReplyPage";
import TwitterPage from "./pages/TwitterPage";
import ThreadsPage from "./pages/ThreadsPage";
import FacebookAutoPostPage from "./pages/FacebookAutoPostPage";
import UnlockYouTubePage from "./pages/UnlockYouTubePage";
import UnlockFacebookPage from "./pages/UnlockFacebookPage";
import TermsPage from "./pages/TermsPage";
import ShortRedirectPage from "./pages/ShortRedirectPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Gated = ({ children }: { children: React.ReactNode }) => (
  <PasswordGate>{children}</PasswordGate>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public smart-link unlock pages (self-hosted, testing) */}
            <Route path="/u/fb/:postId" element={<UnlockFacebookPage />} />
            <Route path="/u/:videoId" element={<UnlockYouTubePage />} />
            <Route path="/s/:code" element={<ShortRedirectPage />} />
            <Route path="/terms" element={<TermsPage />} />



            {/* OAuth callback (public) */}
            <Route path="/youtube-callback" element={<YouTubeCallbackPage />} />

            {/* Password-gated app */}
            <Route element={<Gated><AppLayout /></Gated>}>
              <Route path="/" element={<Index />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/bulk-upload" element={<BulkUploadPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/social" element={<SocialPage />} />
              <Route path="/my-videos" element={<MyVideosPage />} />
              <Route path="/ig-auto-reply" element={<IgAutoReplyPage />} />
              <Route path="/twitter" element={<TwitterPage />} />
              <Route path="/threads" element={<ThreadsPage />} />
              <Route path="/fb-auto-post" element={<FacebookAutoPostPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
