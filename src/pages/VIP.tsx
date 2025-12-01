import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, CalendarIcon, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { User } from "@supabase/supabase-js";

export default function VIP() {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [bundles, setBundles] = useState<any[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minOdds, setMinOdds] = useState<string>("");
  const [maxOdds, setMaxOdds] = useState<string>("");
  const [loadingBundles, setLoadingBundles] = useState(false);
  const [currentView, setCurrentView] = useState<"plans" | "predictions">("plans");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view VIP predictions");
      navigate("/auth");
      setLoading(false);
      return;
    }
    
    setUser(session.user);
    setIsAuthenticated(true);
    setLoading(false);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  useEffect(() => {
    if (hasSubscription && currentView === "predictions") {
      fetchVIPBundles();
    }
  }, [hasSubscription, selectedDate, currentView]);

  useEffect(() => {
    applyFilters();
  }, [bundles, statusFilter, minOdds, maxOdds]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription:', error);
        toast.error('Failed to check subscription status');
        return;
      }

      const hasActiveSubscription = !!data;
      setHasSubscription(hasActiveSubscription);
      
      // If subscription status changed to inactive, force back to plans view
      if (!hasActiveSubscription && currentView === "predictions") {
        setCurrentView("plans");
        setBundles([]);
        toast.error("Your subscription has expired. Please renew to access predictions.");
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const fetchVIPBundles = async () => {
    // Guard: Don't fetch if no subscription
    if (!hasSubscription) {
      setBundles([]);
      toast.error("Active subscription required to view predictions");
      setCurrentView("plans");
      return;
    }

    setLoadingBundles(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('prediction_bundles')
        .select(`
          *,
          predictions (*)
        `)
        .eq('prediction_type', 'vip')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bundles:', error);
        toast.error('Failed to load predictions');
        return;
      }

      setBundles(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingBundles(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bundles];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(bundle => bundle.final_status === statusFilter);
    }

    // Odds range filter
    if (minOdds !== "") {
      const min = parseFloat(minOdds);
      filtered = filtered.filter(bundle => parseFloat(bundle.total_odds) >= min);
    }
    if (maxOdds !== "") {
      const max = parseFloat(maxOdds);
      filtered = filtered.filter(bundle => parseFloat(bundle.total_odds) <= max);
    }

    setFilteredBundles(filtered);
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setMinOdds("");
    setMaxOdds("");
  };


  const plans = [
    { name: "2 Weeks", price: "$2.99", paymentLink: "https://paystack.shop/pay/39fxqcd5ub" },
    { name: "1 Month", price: "$5.99", paymentLink: "https://paystack.shop/pay/mtir55093q" },
    { name: "6 Months", price: "$19.99", paymentLink: "https://paystack.shop/pay/iri4mxhp9e" },
    { name: "Yearly", price: "$30.99", paymentLink: "https://paystack.shop/pay/t114p21jd8" },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">VIP Predictions</h2>
              <p className="text-muted-foreground">Exclusive premium betting insights</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant={currentView === "plans" ? "default" : "outline"}
                onClick={() => setCurrentView("plans")}
                className="shadow-sm"
              >
                Plans
              </Button>
              <Button
                variant={currentView === "predictions" ? "default" : "outline"}
                onClick={() => {
                  if (!hasSubscription) {
                    toast.error("Please subscribe to a VIP plan first. Your access will be activated once payment is confirmed and verified by the admin.");
                    setCurrentView("plans");
                    return;
                  }
                  setCurrentView("predictions");
                }}
                disabled={!hasSubscription}
                className="shadow-sm"
              >
                My Predictions
              </Button>
              
              {hasSubscription && currentView === "predictions" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal shadow-sm",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

        {currentView === "plans" ? (
          <div className="bg-card/80 backdrop-blur border border-border rounded-xl shadow-lg p-8">
            <div className="text-center">
              <Star className="h-20 w-20 text-primary mx-auto mb-4" />
              <h3 className="text-3xl font-bold text-foreground mb-3">Go Premium with VIP</h3>
              <p className="text-muted-foreground text-lg mb-10">
                Subscribe now to access our highest accuracy predictions and exclusive content.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className="bg-background/60 backdrop-blur border-2 border-border rounded-xl p-6 hover:border-primary hover:shadow-xl transition-all duration-300"
                  >
                    <h4 className="text-xl font-bold text-foreground mb-3">{plan.name}</h4>
                    <p className="text-4xl font-bold text-primary mb-6">{plan.price}</p>
                    <Button
                      className="w-full shadow-md"
                      onClick={() => window.open(plan.paymentLink, '_blank')}
                    >
                      Select Plan
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !hasSubscription ? (
          <div className="bg-card/80 backdrop-blur border border-border rounded-xl shadow-lg p-12 text-center">
            <Star className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-foreground mb-3">Subscription Required</h3>
            <p className="text-muted-foreground text-lg mb-8">
              You need an active VIP subscription to access predictions. Please subscribe to a plan and wait for admin confirmation after payment.
            </p>
            <Button size="lg" onClick={() => setCurrentView("plans")} className="shadow-md">
              View Plans
            </Button>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            {hasSubscription && currentView === "predictions" && (
              <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-4 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Filters</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="vip-status-filter" className="text-sm text-muted-foreground mb-2 block">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="vip-status-filter" className="bg-background">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="vip-min-odds" className="text-sm text-muted-foreground mb-2 block">Min Odds</Label>
                    <Input
                      id="vip-min-odds"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1.50"
                      value={minOdds}
                      onChange={(e) => setMinOdds(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vip-max-odds" className="text-sm text-muted-foreground mb-2 block">Max Odds</Label>
                    <Input
                      id="vip-max-odds"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 10.00"
                      value={maxOdds}
                      onChange={(e) => setMaxOdds(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={resetFilters}
                      className="w-full"
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {loadingBundles ? (
                <div className="text-center py-16 bg-card/50 backdrop-blur border border-border rounded-xl shadow-lg">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground text-lg">Loading predictions...</p>
                </div>
              ) : filteredBundles.length === 0 ? (
                <div className="text-center py-16 bg-card/50 backdrop-blur border border-border rounded-xl shadow-lg">
                  <p className="text-muted-foreground text-lg">
                    {bundles.length === 0 
                      ? "No VIP prediction packages available for this date." 
                      : "No predictions match your filters. Try adjusting the filter criteria."}
                  </p>
                </div>
              ) : (
                filteredBundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="p-8 bg-card/80 backdrop-blur border border-border rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {/* Bundle Header */}
                  <div className="mb-6 pb-6 border-b-2 border-border">
                    {bundle.booking_code && (
                      <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-muted-foreground text-sm">Booking Code: </span>
                        <span className="font-mono font-bold text-primary text-2xl">{bundle.booking_code}</span>
                        <span className="text-muted-foreground ml-3 text-sm">on</span>
                        <span className="font-semibold text-foreground ml-2">{bundle.betting_platform || 'football.com'}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-foreground text-2xl">
                        Package #{bundle.id.slice(0, 8)}
                      </div>
                      <span className="px-4 py-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground rounded-full font-bold text-sm shadow-md">🔒 VIP</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(bundle.created_at).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                  
                  {/* Fixture List & Results */}
                  <div className="mb-6">
                    <h4 className="font-bold text-foreground text-lg mb-4">Fixture List & Results</h4>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b-2 border-border">
                            <th className="text-left py-4 px-4 font-bold text-foreground">Match</th>
                            <th className="text-left py-4 px-4 font-bold text-foreground">Prediction</th>
                            <th className="text-left py-4 px-4 font-bold text-foreground">Odds</th>
                            <th className="text-left py-4 px-4 font-bold text-foreground">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bundle.predictions?.map((pred: any, idx: number) => (
                            <tr key={pred.id} className={cn("border-b border-border hover:bg-muted/30 transition-colors", idx % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                              <td className="py-4 px-4 text-foreground font-medium">{pred.match_name}</td>
                              <td className="py-4 px-4 text-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-primary">⚽</span>
                                  {pred.prediction_text}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-foreground font-bold text-base">
                                {parseFloat(pred.odds).toFixed(2)}
                              </td>
                          <td className="py-3 px-2">
                            <span className={cn(
                              "px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide inline-block min-w-[80px] text-center",
                              pred.result === 'won' 
                                ? 'bg-status-won text-status-won-foreground shadow-sm' 
                                : pred.result === 'lost'
                                ? 'bg-status-lost text-status-lost-foreground shadow-sm'
                                : 'bg-status-pending text-status-pending-foreground shadow-sm'
                            )}>
                              {pred.result?.toUpperCase() || 'PENDING'}
                            </span>
                          </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Package Summary */}
                  <div className="pt-6 border-t-2 border-border bg-muted/30 -mx-8 -mb-8 px-8 py-6 rounded-b-xl">
                    <h4 className="font-bold text-foreground text-lg mb-4">Package Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <span className="text-sm text-muted-foreground block mb-1">Total Combined Odds</span>
                        <span className="text-3xl font-bold text-primary">
                          {parseFloat(bundle.total_odds).toFixed(2)}
                        </span>
                      </div>
                      <div className="p-4 bg-card rounded-lg border border-border">
                        <span className="text-sm text-muted-foreground block mb-2">Final Package Status</span>
                      <span className={cn(
                        "px-5 py-2 rounded-full font-bold text-sm uppercase tracking-wide inline-block",
                        bundle.final_status === 'won' 
                          ? 'bg-status-won text-status-won-foreground shadow-md' 
                          : bundle.final_status === 'lost'
                          ? 'bg-status-lost text-status-lost-foreground shadow-md'
                          : 'bg-status-pending text-status-pending-foreground shadow-md'
                      )}>
                        {bundle.final_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}