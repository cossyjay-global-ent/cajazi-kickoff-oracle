import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Menu, Users, Shield, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, memo } from "react";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

// Memoized navigation link component
const NavLink = memo(({ to, isActive, children, onClick, className }: {
  to: string;
  isActive: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <Link to={to} onClick={onClick}>
    <Button 
      variant={isActive ? "default" : "ghost"} 
      size="sm"
      className={className}
    >
      {children}
    </Button>
  </Link>
));
NavLink.displayName = "NavLink";

export const Header = memo(() => {
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

  const checkAdminStatus = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    try {
      setUser(null);
      setIsAdmin(false);
      setMobileMenuOpen(false);
      
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
  }, [loggingOut, navigate, toast]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">KickoffPrediction</h1>
              <p className="text-xs text-muted-foreground">Winning Starts Here</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" isActive={isActive("/")}>Home</NavLink>
            <NavLink to="/predictions" isActive={isActive("/predictions")}>Predictions</NavLink>
            <NavLink to="/statistics" isActive={isActive("/statistics")}>Statistics</NavLink>
            <NavLink to="/history" isActive={isActive("/history")}>History</NavLink>
            <NavLink to="/vip" isActive={isActive("/vip")}>VIP Predictions</NavLink>
            <NavLink to="/profile" isActive={isActive("/profile")}>Profile</NavLink>
            <NavLink to="/settings" isActive={isActive("/settings")}>
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </NavLink>
            <NavLink to="/leaderboard" isActive={isActive("/leaderboard")}>Leaderboard</NavLink>
            {user && (
              <NavLink to="/following" isActive={isActive("/following")}>
                <Users className="h-4 w-4 mr-1" />
                Following
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationDropdown userId={user.id} />
                {isAdmin && (
                  <Badge variant="secondary" className="hidden sm:flex items-center gap-1 bg-primary/10 text-primary">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
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
                  <NavLink to="/" isActive={isActive("/")} onClick={closeMobileMenu} className="w-full justify-start">
                    Home
                  </NavLink>
                  <NavLink to="/predictions" isActive={isActive("/predictions")} onClick={closeMobileMenu} className="w-full justify-start">
                    Predictions
                  </NavLink>
                  <NavLink to="/statistics" isActive={isActive("/statistics")} onClick={closeMobileMenu} className="w-full justify-start">
                    Statistics
                  </NavLink>
                  <NavLink to="/history" isActive={isActive("/history")} onClick={closeMobileMenu} className="w-full justify-start">
                    History
                  </NavLink>
                  <NavLink to="/vip" isActive={isActive("/vip")} onClick={closeMobileMenu} className="w-full justify-start">
                    VIP Predictions
                  </NavLink>
                  <NavLink to="/profile" isActive={isActive("/profile")} onClick={closeMobileMenu} className="w-full justify-start">
                    Profile
                  </NavLink>
                  <NavLink to="/settings" isActive={isActive("/settings")} onClick={closeMobileMenu} className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </NavLink>
                  <NavLink to="/leaderboard" isActive={isActive("/leaderboard")} onClick={closeMobileMenu} className="w-full justify-start">
                    Leaderboard
                  </NavLink>
                  {user && (
                    <NavLink to="/following" isActive={isActive("/following")} onClick={closeMobileMenu} className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Following Feed
                    </NavLink>
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
                        <Link to="/auth" onClick={closeMobileMenu}>
                          <Button variant="outline" className="w-full">
                            Login
                          </Button>
                        </Link>
                        <Link to="/auth?mode=register" onClick={closeMobileMenu}>
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
});

Header.displayName = "Header";
