import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Clock, XCircle, UserPlus, Mail, Search, RefreshCw, Filter, CreditCard, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Subscription {
  id: string;
  user_id: string | null;
  payment_email: string | null;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  registration_status: string | null;
  created_at: string;
  // Joined profile data
  profile?: {
    email: string;
    display_name: string | null;
  } | null;
}

type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled';

// Plan prices in NGN
const PLAN_PRICES: Record<string, number> = {
  '2_weeks': 4500,
  '1_month': 8500,
  '6_months': 35000,
  'yearly': 55000,
};

const PLAN_LABELS: Record<string, string> = {
  '2_weeks': '2 Weeks',
  '1_month': 'Monthly',
  '6_months': '6 Months',
  'yearly': '1 Year',
};

export const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // Manual activation form
  const [newEmail, setNewEmail] = useState("");
  const [planType, setPlanType] = useState<string>("1_month");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    fetchAllSubscriptions();
  }, []);

  const fetchAllSubscriptions = async () => {
    setLoading(true);
    try {
      // Fetch ALL subscriptions without any filtering - complete ledger
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        toast.error('Failed to load subscriptions');
        return;
      }

      // Fetch profiles for linked subscriptions
      const userIds = subs?.filter(s => s.user_id).map(s => s.user_id) || [];
      let profilesMap: Record<string, { email: string; display_name: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .in('id', userIds);
        
        if (profiles) {
          profiles.forEach(p => {
            profilesMap[p.id] = { email: p.email, display_name: p.display_name };
          });
        }
      }

      // Merge profile data with subscriptions
      const enrichedSubs: Subscription[] = (subs || []).map(sub => ({
        ...sub,
        profile: sub.user_id ? profilesMap[sub.user_id] || null : null,
      }));

      setSubscriptions(enrichedSubs);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = (sub: Subscription): SubscriptionStatus => {
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    
    if (sub.status === 'cancelled') return 'cancelled';
    if (expiresAt < now || sub.status === 'expired') return 'expired';
    if (!sub.user_id || sub.registration_status === 'pending') return 'pending';
    return 'active';
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-success text-success-foreground text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning text-warning-foreground text-xs">
            <UserPlus className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const status = getSubscriptionStatus(sub);
    
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus !== status) return false;
    }
    
    // Plan filter
    if (filterPlan !== 'all') {
      if (sub.plan_type !== filterPlan) return false;
    }
    
    // Date range filter
    if (dateFrom) {
      const created = new Date(sub.created_at);
      if (created < dateFrom) return false;
    }
    if (dateTo) {
      const created = new Date(sub.created_at);
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (created > endOfDay) return false;
    }
    
    // Email search
    if (searchEmail) {
      const search = searchEmail.toLowerCase();
      const paymentEmail = sub.payment_email?.toLowerCase() || '';
      const profileEmail = sub.profile?.email?.toLowerCase() || '';
      if (!paymentEmail.includes(search) && !profileEmail.includes(search)) return false;
    }
    
    return true;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => getSubscriptionStatus(s) === 'active').length,
    pending: subscriptions.filter(s => getSubscriptionStatus(s) === 'pending').length,
    expired: subscriptions.filter(s => getSubscriptionStatus(s) === 'expired').length,
    cancelled: subscriptions.filter(s => getSubscriptionStatus(s) === 'cancelled').length,
  };

  const totalRevenue = subscriptions.reduce((acc, sub) => {
    return acc + (PLAN_PRICES[sub.plan_type] || 0);
  }, 0);

  const calculateExpiryDate = (plan: string): Date => {
    const now = new Date();
    switch (plan) {
      case "2_weeks": return new Date(now.setDate(now.getDate() + 14));
      case "1_month": return new Date(now.setMonth(now.getMonth() + 1));
      case "6_months": return new Date(now.setMonth(now.getMonth() + 6));
      case "yearly": return new Date(now.setFullYear(now.getFullYear() + 1));
      default: return new Date(now.setMonth(now.getMonth() + 1));
    }
  };

  const handleManualActivation = async () => {
    if (!newEmail.trim() || !expiresAt) {
      toast.error("Please enter email and expiry date");
      return;
    }

    const emailLower = newEmail.trim().toLowerCase();
    setActivating(true);

    try {
      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailLower)
        .maybeSingle();

      const subscriptionData: any = {
        payment_email: emailLower,
        plan_type: planType,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        registration_status: existingProfile ? 'registered' : 'pending',
      };

      if (existingProfile) {
        subscriptionData.user_id = existingProfile.id;
      }

      const { error } = await supabase.from('subscriptions').insert(subscriptionData);

      if (error) throw error;

      toast.success(
        existingProfile 
          ? `Subscription activated for ${emailLower}` 
          : `Subscription created for ${emailLower} - will link when they register`
      );
      
      setDialogOpen(false);
      setNewEmail("");
      setPlanType("1_month");
      setExpiresAt(undefined);
      fetchAllSubscriptions();
    } catch (error: any) {
      console.error("Error activating subscription:", error);
      toast.error(error.message || "Failed to activate subscription");
    } finally {
      setActivating(false);
    }
  };

  const handleExpireSubscription = async (subId: string) => {
    if (!confirm("Expire this subscription?")) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired', expires_at: new Date().toISOString() })
        .eq('id', subId);

      if (error) throw error;
      toast.success("Subscription expired");
      fetchAllSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to expire subscription");
    }
  };

  const handleExtendSubscription = async (subId: string, currentExpiry: string) => {
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ expires_at: newExpiry.toISOString(), status: 'active' })
        .eq('id', subId);

      if (error) throw error;
      toast.success("Subscription extended by 1 month");
      fetchAllSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to extend subscription");
    }
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterPlan("all");
    setSearchEmail("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const formatAmount = (planType: string) => {
    const amount = PLAN_PRICES[planType];
    return amount ? `₦${amount.toLocaleString()}` : 'N/A';
  };

  const getSource = (sub: Subscription) => {
    // If there's a user_id linked and registration_status is registered, it came through proper flow
    if (sub.user_id && sub.registration_status === 'registered') {
      return 'Paystack Webhook';
    }
    // If pending registration, payment came through but user hasn't registered
    if (sub.registration_status === 'pending') {
      return 'Paystack Webhook (Unlinked)';
    }
    return 'Manual Activation';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            VIP Subscription Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Complete ledger of all subscription transactions
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAllSubscriptions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-none">
                <Mail className="h-4 w-4 mr-2" />
                Activate by Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Activate VIP Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Customer Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Subscription will auto-link when this email registers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <Select 
                    value={planType} 
                    onValueChange={(value) => {
                      setPlanType(value);
                      setExpiresAt(calculateExpiryDate(value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2_weeks">2 Weeks - ₦4,500</SelectItem>
                      <SelectItem value="1_month">1 Month - ₦8,500</SelectItem>
                      <SelectItem value="6_months">6 Months - ₦35,000</SelectItem>
                      <SelectItem value="yearly">1 Year - ₦55,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !expiresAt && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiresAt ? format(expiresAt, "PPP") : <span>Pick expiry date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expiresAt} onSelect={setExpiresAt} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button onClick={handleManualActivation} className="w-full" disabled={activating}>
                  {activating ? "Activating..." : "Activate Subscription"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Records</div>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.active}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
          <div className="text-xs text-muted-foreground">Expired</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{stats.cancelled}</div>
          <div className="text-xs text-muted-foreground">Cancelled</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-primary">₦{totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Revenue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {(filterStatus !== 'all' || filterPlan !== 'all' || searchEmail || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Email Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Plan Filter */}
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="2_weeks">2 Weeks</SelectItem>
              <SelectItem value="1_month">Monthly</SelectItem>
              <SelectItem value="6_months">6 Months</SelectItem>
              <SelectItem value="yearly">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("h-9 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
            </PopoverContent>
          </Popover>
          
          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("h-9 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
        </p>
      </div>

      {/* Subscription Table */}
      <ScrollArea className="h-[500px] border rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              Loading subscriptions...
            </div>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {subscriptions.length === 0 
                ? 'No subscription records found' 
                : 'No subscriptions match your filters'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => {
                const status = getSubscriptionStatus(sub);
                const displayEmail = sub.profile?.email || sub.payment_email || 'Unknown';
                const isActive = status === 'active' || status === 'pending';
                const isUnregistered = !sub.user_id;
                
                return (
                  <TableRow 
                    key={sub.id}
                    className={cn(
                      status === 'pending' && "bg-warning/5",
                      status === 'expired' && "opacity-70"
                    )}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {displayEmail}
                        </span>
                        {isUnregistered && (
                          <span className="text-xs text-warning flex items-center gap-1 mt-0.5">
                            <UserPlus className="h-3 w-3" />
                            Unregistered
                          </span>
                        )}
                        {sub.payment_email && sub.profile?.email && sub.payment_email !== sub.profile.email && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            Paid: {sub.payment_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize whitespace-nowrap">
                        {PLAN_LABELS[sub.plan_type] || sub.plan_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatAmount(sub.plan_type)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(sub.started_at), "PP")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={cn(
                        "text-sm",
                        status === 'expired' ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {sub.expires_at 
                          ? format(new Date(sub.expires_at), "PP")
                          : <span className="italic">Not activated</span>
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {sub.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getSource(sub)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isActive && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleExtendSubscription(sub.id, sub.expires_at)}
                          >
                            +1 Mo
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleExpireSubscription(sub.id)}
                          >
                            Expire
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      {/* Footer Info */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          This ledger displays all subscription transactions. Pending subscriptions will auto-link when users register with matching email.
        </p>
      </div>
    </div>
  );
};
