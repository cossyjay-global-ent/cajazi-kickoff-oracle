import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    try {
      // Clear local state immediately
      setUser(null);
      setIsAdmin(false);
      setMobileMenuOpen(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        toast({
          title: "Logout Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
      
      // Navigate to auth page
      navigate("/auth");
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Logout Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Cajazi Prediction</h1>
              <p className="text-xs text-muted-foreground">Winning Starts Here</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button variant={isActive("/") ? "default" : "ghost"} size="sm">
                Home
              </Button>
            </Link>
            <Link to="/livescore">
              <Button variant={isActive("/livescore") ? "default" : "ghost"} size="sm">
                Livescore
              </Button>
            </Link>
            <Link to="/predictions">
              <Button variant={isActive("/predictions") ? "default" : "ghost"} size="sm">
                Predictions
              </Button>
            </Link>
            <Link to="/statistics">
              <Button variant={isActive("/statistics") ? "default" : "ghost"} size="sm">
                Statistics
              </Button>
            </Link>
            <Link to="/history">
              <Button variant={isActive("/history") ? "default" : "ghost"} size="sm">
                History
              </Button>
            </Link>
            <Link to="/vip">
              <Button variant={isActive("/vip") ? "default" : "ghost"} size="sm">
                VIP Predictions
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant={isActive("/profile") ? "default" : "ghost"} size="sm">
                Profile
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant={isActive("/admin") ? "default" : "ghost"} size="sm">
                  Admin
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout} 
                  disabled={loggingOut}
                  className="hidden md:flex"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <div className="hidden md:flex gap-2">
                <Link to="/auth">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/auth?mode=register">
                  <Button size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/") ? "default" : "ghost"} className="w-full justify-start">
                      Home
                    </Button>
                  </Link>
                  <Link to="/livescore" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/livescore") ? "default" : "ghost"} className="w-full justify-start">
                      Livescore
                    </Button>
                  </Link>
                  <Link to="/predictions" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/predictions") ? "default" : "ghost"} className="w-full justify-start">
                      Predictions
                    </Button>
                  </Link>
                  <Link to="/statistics" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/statistics") ? "default" : "ghost"} className="w-full justify-start">
                      Statistics
                    </Button>
                  </Link>
                  <Link to="/history" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/history") ? "default" : "ghost"} className="w-full justify-start">
                      History
                    </Button>
                  </Link>
                  <Link to="/vip" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/vip") ? "default" : "ghost"} className="w-full justify-start">
                      VIP Predictions
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant={isActive("/profile") ? "default" : "ghost"} className="w-full justify-start">
                      Profile
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant={isActive("/admin") ? "default" : "ghost"} className="w-full justify-start">
                        Admin
                      </Button>
                    </Link>
                  )}
                  
                  <div className="border-t pt-4 mt-4">
                    {user ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleLogout}
                        disabled={loggingOut}
                      >
                        {loggingOut ? "Logging out..." : "Logout"}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full">
                            Login
                          </Button>
                        </Link>
                        <Link to="/auth?mode=register" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="w-full">
                            Register
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};