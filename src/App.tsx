import { Toaster } from "@/components/ui/toaster";
import PublicProfile from "./pages/PublicProfile";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Livescore from "./pages/Livescore";
import Predictions from "./pages/Predictions";
import Statistics from "./pages/Statistics";
import VIP from "./pages/VIP";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import About from "./pages/About";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import Following from "./pages/Following";
import NotFound from "./pages/NotFound";
import { useRealtimePredictions } from "./hooks/useRealtimePredictions";

const queryClient = new QueryClient();

const App = () => {
  // Set up realtime notifications
  useRealtimePredictions();
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/livescore" element={<Livescore />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/vip" element={<VIP />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/about" element={<About />} />
              <Route path="/history" element={<History />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/user/:userId" element={<PublicProfile />} />
              <Route path="/following" element={<Following />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;