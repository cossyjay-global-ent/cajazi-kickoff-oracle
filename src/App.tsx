import { lazy, Suspense, memo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { useRealtimePredictions } from "./hooks/useRealtimePredictions";
import { FullPageState } from "@/components/FullPageState";

// Lazy load all route components for code splitting
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminNewsletter = lazy(() => import("./pages/AdminNewsletter"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Predictions = lazy(() => import("./pages/Predictions"));
const Statistics = lazy(() => import("./pages/Statistics"));
const VIP = lazy(() => import("./pages/VIP"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const ResponsibleGaming = lazy(() => import("./pages/ResponsibleGaming"));
const History = lazy(() => import("./pages/History"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Following = lazy(() => import("./pages/Following"));
const Install = lazy(() => import("./pages/Install"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with better caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Lightweight loading fallback
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <FullPageState
      title="Loading"
      description="Please wait..."
      variant="loading"
    />
  </div>
));
PageLoader.displayName = "PageLoader";

// Memoized Footer to prevent re-renders
const MemoizedFooter = memo(Footer);
MemoizedFooter.displayName = "MemoizedFooter";

// Inner component that uses hooks requiring context
const AppContent = memo(() => {
  // Set up realtime notifications
  useRealtimePredictions();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/vip" element={<VIP />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/newsletter" element={<AdminNewsletter />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
            <Route path="/history" element={<History />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/user/:userId" element={<PublicProfile />} />
            <Route path="/following" element={<Following />} />
            <Route path="/install" element={<Install />} />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <MemoizedFooter />
      <InstallPrompt />
      <FloatingWhatsApp />
    </div>
  );
});
AppContent.displayName = "AppContent";

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppErrorBoundary>
            <AppContent />
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
