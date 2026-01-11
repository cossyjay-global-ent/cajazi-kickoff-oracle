import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PredictionCard } from "@/components/PredictionCard";
import { FullPageState } from "@/components/FullPageState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Predictions() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minOdds, setMinOdds] = useState<string>("");
  const [maxOdds, setMaxOdds] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBundles();
    }
  }, [selectedDate, isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [bundles, statusFilter, minOdds, maxOdds]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view predictions");
      navigate("/auth");
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  };

  const fetchBundles = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('prediction_bundles')
      .select(`
        *,
        predictions (*)
      `)
      .eq('prediction_type', 'free')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setBundles(data);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <FullPageState
        title="Redirecting to login"
        description="Please sign in to view predictions."
        variant="loading"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2">Free Predictions</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Daily expert football betting tips</p>
              </div>
            
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full sm:w-auto sm:max-w-[240px] justify-start text-left font-normal shadow-sm text-sm",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filter Bar */}
            <div className="bg-card/80 backdrop-blur border border-border rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Filters</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="status-filter" className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 block">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="bg-background text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="postponed">Postponed</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="min-odds" className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 block">Min Odds</Label>
                  <Input
                    id="min-odds"
                    type="number"
                    step="0.01"
                    placeholder="1.50"
                    value={minOdds}
                    onChange={(e) => setMinOdds(e.target.value)}
                    className="bg-background text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="max-odds" className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 block">Max Odds</Label>
                  <Input
                    id="max-odds"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={maxOdds}
                    onChange={(e) => setMaxOdds(e.target.value)}
                    className="bg-background text-sm"
                  />
                </div>

                <div className="flex items-end col-span-2 sm:col-span-1">
                  <Button 
                    variant="outline" 
                    onClick={resetFilters}
                    className="w-full text-sm"
                    size="sm"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {filteredBundles.length === 0 ? (
              <div className="text-center py-10 sm:py-16 bg-card/50 backdrop-blur border border-border rounded-xl shadow-lg">
                <p className="text-muted-foreground text-sm sm:text-lg">
                  {bundles.length === 0 
                    ? "No prediction packages available for this date." 
                    : "No predictions match your filters. Try adjusting the filter criteria."}
                </p>
              </div>
            ) : (
              filteredBundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="p-4 sm:p-8 bg-card/80 backdrop-blur border border-border rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {/* Bundle Header */}
                  <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b-2 border-border">
                    {bundle.booking_code && (
                      <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-muted-foreground text-xs sm:text-sm">Code: </span>
                        <span className="font-mono font-bold text-primary text-lg sm:text-2xl">{bundle.booking_code}</span>
                        <span className="text-muted-foreground ml-2 sm:ml-3 text-xs sm:text-sm">on</span>
                        <span className="font-semibold text-foreground ml-1 sm:ml-2 text-sm">{bundle.betting_platform || 'football.com'}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="font-bold text-foreground text-lg sm:text-2xl">
                        Package #{bundle.id.slice(0, 8)}
                      </div>
                      <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary rounded-full font-bold text-xs sm:text-sm">🆓 FREE</span>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(bundle.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                
                  {/* Fixture List & Results */}
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-bold text-foreground text-sm sm:text-lg mb-3 sm:mb-4">Fixture List & Results</h4>
                    
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
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
                              <td className="py-4 px-4">
                                <span className={cn(
                                  "px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide inline-block min-w-[80px] text-center",
                                  pred.result === 'won' 
                                    ? 'bg-status-won text-status-won-foreground shadow-sm' 
                                    : pred.result === 'lost'
                                    ? 'bg-status-lost text-status-lost-foreground shadow-sm'
                                    : pred.result === 'postponed' || pred.result === 'void' || pred.result === 'canceled'
                                    ? 'bg-muted text-muted-foreground shadow-sm'
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

                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {bundle.predictions?.map((pred: any) => (
                        <div key={pred.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                          <div className="font-medium text-foreground text-sm mb-2">{pred.match_name}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                            <span className="text-muted-foreground">⚽ {pred.prediction_text}</span>
                            <span className="font-semibold text-primary">@ {parseFloat(pred.odds).toFixed(2)}</span>
                          </div>
                          <span className={cn(
                            "px-3 py-1 rounded-full font-bold text-xs uppercase inline-block",
                            pred.result === 'won' 
                              ? 'bg-status-won text-status-won-foreground' 
                              : pred.result === 'lost'
                              ? 'bg-status-lost text-status-lost-foreground'
                              : pred.result === 'postponed' || pred.result === 'void' || pred.result === 'canceled'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-status-pending text-status-pending-foreground'
                          )}>
                            {pred.result?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                
                  {/* Package Summary */}
                  <div className="pt-4 sm:pt-6 border-t-2 border-border bg-muted/30 -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 px-4 sm:px-8 py-4 sm:py-6 rounded-b-xl">
                    <h4 className="font-bold text-foreground text-sm sm:text-lg mb-3 sm:mb-4">Package Summary</h4>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-card rounded-lg border border-border">
                        <span className="text-xs sm:text-sm text-muted-foreground block mb-1">Total Odds</span>
                        <span className="text-xl sm:text-3xl font-bold text-primary">
                          {parseFloat(bundle.total_odds).toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3 sm:p-4 bg-card rounded-lg border border-border">
                        <span className="text-xs sm:text-sm text-muted-foreground block mb-1 sm:mb-2">Status</span>
                        <span className={cn(
                          "px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-bold text-xs uppercase tracking-wide inline-block",
                          bundle.final_status === 'won' 
                            ? 'bg-status-won text-status-won-foreground shadow-md' 
                            : bundle.final_status === 'lost'
                            ? 'bg-status-lost text-status-lost-foreground shadow-md'
                            : bundle.final_status === 'postponed' || bundle.final_status === 'void' || bundle.final_status === 'canceled'
                            ? 'bg-muted text-muted-foreground shadow-md'
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
        </div>
      </div>
    </div>
  );
}