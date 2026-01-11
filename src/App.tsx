import { Toaster } from "@/components/ui/toaster";
import PublicProfile from "./pages/PublicProfile";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Home from "./pages/Home";
import Auth from "./pages/Auth";

import Predictions from "./pages/Predictions";
import Statistics from "./pages/Statistics";
import VIP from "./pages/VIP";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ResponsibleGaming from "./pages/ResponsibleGaming";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import Following from "./pages/Following";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import { useRealtimePredictions } from "./hooks/useRealtimePredictions";

const queryClient = new QueryClient();

// Inner component that uses hooks requiring context
const AppContent = () => {
  // Set up realtime notifications
  useRealtimePredictions();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/vip" element={<VIP />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  );
};

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