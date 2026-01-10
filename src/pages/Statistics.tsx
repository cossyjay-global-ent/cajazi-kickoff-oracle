import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trophy, TrendingUp, Target, Percent, Filter } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface StatsSummary {
  totalPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  winRate: number;
  averageOdds: number;
  totalBundles: number;
}

interface ComparisonStats {
  free: StatsSummary;
  vip: StatsSummary;
}

interface PredictionTypeStats {
  type: string;
  total: number;
  won: number;
  lost: number;
  winRate: number;
}

interface LeaderboardUser {
  email: string;
  totalPredictions: number;
  correctPredictions: number;
  successRate: number;
}

export default function Statistics() {
  const [stats, setStats] = useState<StatsSummary>({
    totalPredictions: 0,
    wonPredictions: 0,
    lostPredictions: 0,
    pendingPredictions: 0,
    winRate: 0,
    averageOdds: 0,
    totalBundles: 0,
  });
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats | null>(null);
  const [predictionTypeStats, setPredictionTypeStats] = useState<PredictionTypeStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [availableSports, setAvailableSports] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
      fetchComparisonData();
      fetchPredictionTypeAnalytics();
      fetchLeaderboard();
      fetchAvailableSports();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
      fetchComparisonData();
      fetchPredictionTypeAnalytics();
    }
  }, [isAuthenticated, dateRange, sportFilter]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to view statistics");
      navigate("/auth");
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  };

  const fetchAvailableSports = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('sport_category')
      .not('sport_category', 'is', null);
    
    if (data) {
      const uniqueSports = Array.from(new Set(data.map(p => p.sport_category).filter(Boolean)));
      setAvailableSports(uniqueSports as string[]);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return sevenDaysAgo.toISOString();
    } else if (dateRange === '30days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return thirtyDaysAgo.toISOString();
    }
    return null;
  };

  const fetchStatistics = async () => {
    let query = supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false });

    const dateFilter = getDateFilter();
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    if (sportFilter !== 'all') {
      query = query.eq('sport_category', sportFilter);
    }

    const { data: predictions } = await query;

    // Fetch all bundles
    const { data: bundles } = await supabase
      .from('prediction_bundles')
      .select('*')
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false });

    if (predictions && bundles) {
      const won = predictions.filter(p => p.result === 'won').length;
      const lost = predictions.filter(p => p.result === 'lost').length;
      const pending = predictions.filter(p => p.result === 'pending' || !p.result).length;
      const total = predictions.length;
      const winRate = total > 0 ? ((won / (won + lost)) * 100) : 0;
      const avgOdds = total > 0 ? predictions.reduce((sum, p) => sum + parseFloat(p.odds as any), 0) / total : 0;

      setStats({
        totalPredictions: total,
        wonPredictions: won,
        lostPredictions: lost,
        pendingPredictions: pending,
        winRate: winRate,
        averageOdds: avgOdds,
        totalBundles: bundles.length,
      });

      // Calculate daily stats for chart
      const dailyData = predictions.reduce((acc: any, pred) => {
        const date = new Date(pred.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[date]) {
          acc[date] = { date, won: 0, lost: 0, pending: 0 };
        }
        if (pred.result === 'won') acc[date].won++;
        else if (pred.result === 'lost') acc[date].lost++;
        else acc[date].pending++;
        return acc;
      }, {});

      setDailyStats(Object.values(dailyData).slice(-7)); // Last 7 days
    }
  };

  const fetchComparisonData = async () => {
    let freeQuery = supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'free');

    let vipQuery = supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'vip');

    const dateFilter = getDateFilter();
    if (dateFilter) {
      freeQuery = freeQuery.gte('created_at', dateFilter);
      vipQuery = vipQuery.gte('created_at', dateFilter);
    }

    if (sportFilter !== 'all') {
      freeQuery = freeQuery.eq('sport_category', sportFilter);
      vipQuery = vipQuery.eq('sport_category', sportFilter);
    }

    const { data: freePredictions } = await freeQuery;
    const { data: vipPredictions } = await vipQuery;

    const { data: freeBundles } = await supabase
      .from('prediction_bundles')
      .select('*')
      .eq('prediction_type', 'free');

    const { data: vipBundles } = await supabase
      .from('prediction_bundles')
      .select('*')
      .eq('prediction_type', 'vip');

    const calculateStats = (predictions: any[], bundles: any[]): StatsSummary => {
      const won = predictions.filter(p => p.result === 'won').length;
      const lost = predictions.filter(p => p.result === 'lost').length;
      const pending = predictions.filter(p => p.result === 'pending' || !p.result).length;
      const total = predictions.length;
      const winRate = total > 0 ? ((won / (won + lost)) * 100) : 0;
      const avgOdds = total > 0 ? predictions.reduce((sum, p) => sum + parseFloat(p.odds as any), 0) / total : 0;

      return {
        totalPredictions: total,
        wonPredictions: won,
        lostPredictions: lost,
        pendingPredictions: pending,
        winRate: winRate,
        averageOdds: avgOdds,
        totalBundles: bundles.length,
      };
    };

    if (freePredictions && vipPredictions && freeBundles && vipBundles) {
      setComparisonStats({
        free: calculateStats(freePredictions, freeBundles),
        vip: calculateStats(vipPredictions, vipBundles),
      });
    }
  };

  const fetchPredictionTypeAnalytics = async () => {
    let query = supabase
      .from('predictions')
      .select('prediction_text, result')
      .in('result', ['won', 'lost']);

    const dateFilter = getDateFilter();
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    if (sportFilter !== 'all') {
      query = query.eq('sport_category', sportFilter);
    }

    const { data: predictions } = await query;

    if (predictions) {
      // Extract prediction types and calculate stats
      const typeMap = new Map<string, { total: number; won: number; lost: number }>();
      
      predictions.forEach(pred => {
        // Extract prediction type from prediction_text
        let type = 'Other';
        const text = pred.prediction_text.toLowerCase();
        
        if (text.includes('over') || text.includes('under')) {
          type = 'Over/Under';
        } else if (text.includes('btts') || text.includes('both teams to score')) {
          type = 'BTTS';
        } else if (text.includes('1x2') || text.includes('home') || text.includes('away') || text.includes('draw')) {
          type = '1X2';
        } else if (text.includes('correct score')) {
          type = 'Correct Score';
        } else if (text.includes('double chance')) {
          type = 'Double Chance';
        } else if (text.includes('handicap') || text.includes('ah')) {
          type = 'Handicap';
        }
        
        if (!typeMap.has(type)) {
          typeMap.set(type, { total: 0, won: 0, lost: 0 });
        }
        
        const stats = typeMap.get(type)!;
        stats.total++;
        if (pred.result === 'won') stats.won++;
        else if (pred.result === 'lost') stats.lost++;
      });
      
      // Convert to array and calculate win rates
      const typeStats: PredictionTypeStats[] = Array.from(typeMap.entries())
        .map(([type, stats]) => ({
          type,
          total: stats.total,
          won: stats.won,
          lost: stats.lost,
          winRate: (stats.won / stats.total) * 100,
        }))
        .filter(stat => stat.total >= 3) // Only show types with at least 3 predictions
        .sort((a, b) => b.winRate - a.winRate);
      
      setPredictionTypeStats(typeStats);
    }
  };

  const fetchLeaderboard = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, predictions_viewed, correct_predictions')
      .gte('predictions_viewed', 5) // Only users with at least 5 viewed predictions
      .order('correct_predictions', { ascending: false });

    if (profiles) {
      const leaderboardData: LeaderboardUser[] = profiles
        .map(profile => ({
          email: profile.email,
          totalPredictions: profile.predictions_viewed || 0,
          correctPredictions: profile.correct_predictions || 0,
          successRate: profile.predictions_viewed > 0 
            ? (profile.correct_predictions / profile.predictions_viewed) * 100 
            : 0,
        }))
        .filter(user => user.totalPredictions >= 5)
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 10); // Top 10 users
      
      setLeaderboard(leaderboardData);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const pieData = [
    { name: 'Won', value: stats.wonPredictions, color: 'hsl(var(--status-won))' },
    { name: 'Lost', value: stats.lostPredictions, color: 'hsl(var(--status-lost))' },
    { name: 'Pending', value: stats.pendingPredictions, color: 'hsl(var(--status-pending))' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-1 sm:mb-2">Statistics Dashboard</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Performance analytics and insights</p>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                    <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    {availableSports.map(sport => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {(dateRange !== '7days' || sportFilter !== 'all') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 text-xs sm:text-sm"
                    onClick={() => {
                      setDateRange('7days');
                      setSportFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Predictions</CardTitle>
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalPredictions}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stats.totalBundles} bundles</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-status-won" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-status-won">{stats.winRate.toFixed(1)}%</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stats.wonPredictions}W / {stats.lostPredictions}L</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Odds</CardTitle>
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-foreground">{stats.averageOdds.toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">All predictions</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-status-pending" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-xl sm:text-3xl font-bold text-status-pending">{stats.pendingPredictions}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Awaiting results</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Daily Performance Chart */}
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base text-foreground">Daily Performance</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Results over time</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} width={30} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="won" fill="hsl(var(--status-won))" name="Won" />
                    <Bar dataKey="lost" fill="hsl(var(--status-lost))" name="Lost" />
                    <Bar dataKey="pending" fill="hsl(var(--status-pending))" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Results Distribution */}
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Results Distribution</CardTitle>
                <CardDescription>Overall prediction outcomes</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Win Rate Trend */}
          <Card className="bg-card/80 backdrop-blur border-border mt-6">
            <CardHeader>
              <CardTitle className="text-foreground">Cumulative Performance</CardTitle>
              <CardDescription>Win rate progression over recent predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="won" stroke="hsl(var(--status-won))" strokeWidth={2} name="Won" />
                  <Line type="monotone" dataKey="lost" stroke="hsl(var(--status-lost))" strokeWidth={2} name="Lost" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* VIP vs Free Comparison */}
          {comparisonStats && (
            <div className="mt-8">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-foreground mb-2">VIP vs Free Comparison</h3>
                <p className="text-muted-foreground">Performance comparison between prediction types</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Free Predictions Summary */}
                <Card className="bg-card/80 backdrop-blur border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      🆓 Free Predictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.free.totalPredictions}</p>
                      </div>
                      <div className="p-3 bg-status-won/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                        <p className="text-2xl font-bold text-status-won">{comparisonStats.free.winRate.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Avg Odds</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.free.averageOdds.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Bundles</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.free.totalBundles}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="px-3 py-1 bg-status-won/10 text-status-won rounded-full">
                        Won: {comparisonStats.free.wonPredictions}
                      </span>
                      <span className="px-3 py-1 bg-status-lost/10 text-status-lost rounded-full">
                        Lost: {comparisonStats.free.lostPredictions}
                      </span>
                      <span className="px-3 py-1 bg-status-pending/10 text-status-pending rounded-full">
                        Pending: {comparisonStats.free.pendingPredictions}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* VIP Predictions Summary */}
                <Card className="bg-card/80 backdrop-blur border-border border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      🔒 VIP Predictions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.vip.totalPredictions}</p>
                      </div>
                      <div className="p-3 bg-status-won/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                        <p className="text-2xl font-bold text-status-won">{comparisonStats.vip.winRate.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Avg Odds</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.vip.averageOdds.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Bundles</p>
                        <p className="text-2xl font-bold text-foreground">{comparisonStats.vip.totalBundles}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="px-3 py-1 bg-status-won/10 text-status-won rounded-full">
                        Won: {comparisonStats.vip.wonPredictions}
                      </span>
                      <span className="px-3 py-1 bg-status-lost/10 text-status-lost rounded-full">
                        Lost: {comparisonStats.vip.lostPredictions}
                      </span>
                      <span className="px-3 py-1 bg-status-pending/10 text-status-pending rounded-full">
                        Pending: {comparisonStats.vip.pendingPredictions}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comparison Bar Chart */}
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Head-to-Head Comparison</CardTitle>
                  <CardDescription>Win rates and performance metrics compared</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart 
                      data={[
                        {
                          metric: 'Win Rate %',
                          Free: comparisonStats.free.winRate,
                          VIP: comparisonStats.vip.winRate,
                        },
                        {
                          metric: 'Avg Odds',
                          Free: comparisonStats.free.averageOdds,
                          VIP: comparisonStats.vip.averageOdds,
                        },
                        {
                          metric: 'Total Predictions',
                          Free: comparisonStats.free.totalPredictions / 10, // Scale down for better visualization
                          VIP: comparisonStats.vip.totalPredictions / 10,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any, name: string, props: any) => {
                          if (props.dataKey === 'Free' || props.dataKey === 'VIP') {
                            if (props.payload.metric === 'Total Predictions') {
                              return [(value * 10).toFixed(0), name]; // Scale back up for display
                            }
                          }
                          return [value.toFixed(2), name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Free" fill="hsl(var(--accent))" name="Free" />
                      <Bar dataKey="VIP" fill="hsl(var(--primary))" name="VIP" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Prediction Type Analytics */}
          {predictionTypeStats.length > 0 && (
            <div className="mt-8">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-foreground mb-2">Prediction Type Analytics</h3>
                <p className="text-muted-foreground">Win rates by prediction type</p>
              </div>

              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Win Rate by Prediction Type</CardTitle>
                  <CardDescription>Performance analysis across different bet types</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={predictionTypeStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="type" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                      />
                      <Legend />
                      <Bar dataKey="winRate" fill="hsl(var(--primary))" name="Win Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                    {predictionTypeStats.map((stat) => (
                      <div key={stat.type} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">{stat.type}</p>
                        <p className="text-lg font-bold text-primary">{stat.winRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{stat.won}/{stat.total} won</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="mt-8">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Trophy className="h-8 w-8 text-primary" />
                  Top Performers Leaderboard
                </h3>
                <p className="text-muted-foreground">Users with the highest prediction success rates</p>
              </div>

              <Card className="bg-card/80 backdrop-blur border-border">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {leaderboard.map((user, index) => (
                      <div 
                        key={user.email}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          index === 0 ? 'bg-primary/10 border-2 border-primary' :
                          index === 1 ? 'bg-accent/10 border-2 border-accent' :
                          index === 2 ? 'bg-muted border-2 border-muted-foreground' :
                          'bg-muted/30 border border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                            index === 0 ? 'bg-primary text-primary-foreground' :
                            index === 1 ? 'bg-accent text-accent-foreground' :
                            index === 2 ? 'bg-muted-foreground text-background' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.correctPredictions} correct out of {user.totalPredictions} predictions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            index === 0 ? 'text-primary' :
                            index === 1 ? 'text-accent' :
                            index === 2 ? 'text-muted-foreground' :
                            'text-foreground'
                          }`}>
                            {user.successRate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
