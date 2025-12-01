import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trophy, TrendingUp, Target, Percent } from "lucide-react";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
      fetchComparisonData();
    }
  }, [isAuthenticated]);

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

  const fetchStatistics = async () => {
    // Fetch all predictions
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'free')
      .order('created_at', { ascending: false });

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
    // Fetch both free and VIP predictions
    const { data: freePredictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'free');

    const { data: vipPredictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('prediction_type', 'vip');

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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-foreground mb-2">Statistics Dashboard</h2>
            <p className="text-muted-foreground">Performance analytics and insights</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Predictions</CardTitle>
                <Target className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.totalPredictions}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.totalBundles} bundles</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                <Percent className="h-5 w-5 text-status-won" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-status-won">{stats.winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.wonPredictions} wins, {stats.lostPredictions} losses</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Odds</CardTitle>
                <TrendingUp className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.averageOdds.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all predictions</p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Trophy className="h-5 w-5 text-status-pending" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-status-pending">{stats.pendingPredictions}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting results</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance Chart */}
            <Card className="bg-card/80 backdrop-blur border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Daily Performance (Last 7 Days)</CardTitle>
                <CardDescription>Prediction results over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
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
        </div>
      </div>
    </div>
  );
}
