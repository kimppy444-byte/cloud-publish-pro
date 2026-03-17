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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PasswordGate>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/bulk-upload" element={<BulkUploadPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/social" element={<SocialPage />} />
                <Route path="/my-videos" element={<MyVideosPage />} />
                <Route path="/ig-auto-reply" element={<IgAutoReplyPage />} />
                <Route path="/twitter" element={<TwitterPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="/youtube-callback" element={<YouTubeCallbackPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PasswordGate>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

