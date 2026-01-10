import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle, Clock, XCircle, UserPlus, Mail, Search, RefreshCw, Filter, CreditCard, AlertCircle, Check, Users, Link as LinkIcon, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Validation schemas
const emailSchema = z.string().trim().email("Invalid email format").max(255, "Email too long");
const activationSchema = z.object({
  email: emailSchema,
});

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
  profile?: {
    email: string;
    display_name: string | null;
  } | null;
}

interface RegisteredUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled';

// Plan prices in NGN
const PLAN_PRICES: Record<string, number> = {
  '2_weeks': 4500,
  '1_month': 8500,
  '6_months': 35000,
  'yearly': 55000,
  '1_year': 55000,
};

const PLAN_LABELS: Record<string, string> = {
  '2_weeks': '2 Weeks',
  '1_month': '1 Month',
  '6_months': '6 Months',
  'yearly': '1 Year',
  '1_year': '1 Year',
};

const PLAN_DURATIONS: Record<string, number> = {
  '2_weeks': 14,
  '1_month': 30,
  '6_months': 180,
  'yearly': 365,
  '1_year': 365,
};

export const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // Manual activation form
  const [newEmail, setNewEmail] = useState("");
  const [planType, setPlanType] = useState<string>("1_month");
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [activating, setActivating] = useState(false);
  
  // Link subscription form
  const [selectedSubForLink, setSelectedSubForLink] = useState<Subscription | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActivating, setBulkActivating] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllSubscriptions(), fetchRegisteredUsers()]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllSubscriptions = async () => {
    try {
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
      toast.error('An error occurred loading subscriptions');
    }
  };

  const fetchRegisteredUsers = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setRegisteredUsers(users || []);
    } catch (error) {
      console.error('Unexpected error fetching users:', error);
    }
  };

  const getSubscriptionStatus = (sub: Subscription): SubscriptionStatus => {
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    
    if (sub.status === 'cancelled') return 'cancelled';
    if (sub.status === 'expired' || expiresAt < now) return 'expired';
    if (sub.status === 'pending') return 'pending';
    if (sub.status === 'active' && sub.user_id && sub.registration_status === 'registered') return 'active';
    // If status is active but no user linked, treat as pending
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
            <Clock className="h-3 w-3 mr-1" />
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
    
    if (filterStatus !== 'all' && filterStatus !== status) return false;
    if (filterPlan !== 'all' && sub.plan_type !== filterPlan) return false;
    
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
    
    if (searchEmail) {
      const search = searchEmail.toLowerCase();
      const paymentEmail = sub.payment_email?.toLowerCase() || '';
      const profileEmail = sub.profile?.email?.toLowerCase() || '';
      if (!paymentEmail.includes(search) && !profileEmail.includes(search)) return false;
    }
    
    return true;
  });

  // Get pending subscriptions for bulk selection
  const pendingSubscriptions = filteredSubscriptions.filter(
    sub => getSubscriptionStatus(sub) === 'pending'
  );
  
  const selectedPendingCount = Array.from(selectedIds).filter(id => 
    pendingSubscriptions.some(sub => sub.id === id)
  ).length;

  const allPendingSelected = pendingSubscriptions.length > 0 && 
    pendingSubscriptions.every(sub => selectedIds.has(sub.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set(pendingSubscriptions.map(sub => sub.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

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

  const calculateExpiryDate = (plan: string, fromDate?: Date): Date => {
    const now = fromDate || new Date();
    const days = PLAN_DURATIONS[plan] || 30;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  };

  // Bulk activation handler
  const handleBulkActivate = async () => {
    const subsToActivate = pendingSubscriptions.filter(sub => selectedIds.has(sub.id));
    
    if (subsToActivate.length === 0) {
      toast.error("No pending subscriptions selected");
      return;
    }

    if (!confirm(`Activate ${subsToActivate.length} subscription(s)?\n\nThis will:\n- Set status to active\n- Update start dates to now\n- Recalculate expiry dates based on plans`)) {
      return;
    }

    setBulkActivating(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Get all emails to check for existing profiles
      const emails = subsToActivate
        .map(sub => sub.payment_email?.toLowerCase())
        .filter((email): email is string => !!email);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', emails);

      const profileMap = new Map(profiles?.map(p => [p.email.toLowerCase(), p.id]) || []);

      // Process each subscription
      for (const sub of subsToActivate) {
        try {
          const now = new Date();
          const newExpiresAt = calculateExpiryDate(sub.plan_type, now);
          const emailLower = sub.payment_email?.toLowerCase();
          const userId = emailLower ? profileMap.get(emailLower) : null;

          const updateData: Record<string, unknown> = {
            status: 'active',
            started_at: now.toISOString(),
            expires_at: newExpiresAt.toISOString(),
            registration_status: userId ? 'registered' : 'pending',
          };

          if (userId) {
            updateData.user_id = userId;
          }

          const { error } = await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('id', sub.id);

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Failed to activate ${sub.id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully activated ${successCount} subscription(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to activate ${errorCount} subscription(s)`);
      }

      setSelectedIds(new Set());
      await fetchAllSubscriptions();
    } catch (error) {
      console.error("Bulk activation error:", error);
      toast.error("Failed to complete bulk activation");
    } finally {
      setBulkActivating(false);
    }
  };

  // CRITICAL: Handle activation with proper date updates
  const handleActivateSubscription = async (subId: string, paymentEmail: string | null) => {
    if (!paymentEmail) {
      toast.error("Cannot activate: No email associated with this subscription");
      return;
    }

    try {
      activationSchema.parse({ email: paymentEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Invalid email format");
        return;
      }
    }

    if (!confirm(`Activate subscription for ${paymentEmail}? This will:\n- Set status to active\n- Update start date to now\n- Recalculate expiry based on plan`)) {
      return;
    }

    setActivating(true);
    try {
      // Get subscription details for plan type
      const sub = subscriptions.find(s => s.id === subId);
      if (!sub) {
        toast.error("Subscription not found");
        return;
      }

      // Check if user exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', paymentEmail.toLowerCase())
        .maybeSingle();

      const now = new Date();
      const newExpiresAt = calculateExpiryDate(sub.plan_type, now);

      const updateData: Record<string, unknown> = {
        status: 'active',
        started_at: now.toISOString(),
        expires_at: newExpiresAt.toISOString(),
        registration_status: existingProfile ? 'registered' : 'pending',
      };

      if (existingProfile) {
        updateData.user_id = existingProfile.id;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subId);

      if (error) throw error;

      toast.success(
        existingProfile
          ? `Subscription activated and linked to ${paymentEmail}`
          : `Subscription activated for ${paymentEmail} (will auto-link on registration)`
      );
      
      await fetchAllSubscriptions();
    } catch (error: unknown) {
      console.error("Activation error:", error);
      const message = error instanceof Error ? error.message : "Failed to activate subscription";
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  // Manual activation via dialog
  const handleManualActivation = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      emailSchema.parse(newEmail.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0]?.message || "Invalid email format");
        return;
      }
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

      const now = new Date();
      const calculatedExpiry = expiresAt || calculateExpiryDate(planType, now);

      const subscriptionData = {
        payment_email: emailLower,
        plan_type: planType,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: calculatedExpiry.toISOString(),
        registration_status: existingProfile ? 'registered' : 'pending',
        user_id: existingProfile?.id || null,
      };

      const { error } = await supabase.from('subscriptions').insert([subscriptionData]);

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
      await fetchAllSubscriptions();
    } catch (error: unknown) {
      console.error("Error activating subscription:", error);
      const message = error instanceof Error ? error.message : "Failed to activate subscription";
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

  // Link subscription to registered user
  const handleLinkToUser = async () => {
    if (!selectedSubForLink || !selectedUserId) {
      toast.error("Please select a user to link");
      return;
    }

    try {
      const selectedUser = registeredUsers.find(u => u.id === selectedUserId);
      if (!selectedUser) {
        toast.error("Selected user not found");
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          user_id: selectedUserId,
          registration_status: 'registered',
          status: 'active',
        })
        .eq('id', selectedSubForLink.id);

      if (error) throw error;

      toast.success(`Subscription linked to ${selectedUser.email}`);
      setLinkDialogOpen(false);
      setSelectedSubForLink(null);
      setSelectedUserId("");
      await fetchAllSubscriptions();
    } catch (error: unknown) {
      console.error("Link error:", error);
      const message = error instanceof Error ? error.message : "Failed to link subscription";
      toast.error(message);
    }
  };

  const openLinkDialog = (sub: Subscription) => {
    setSelectedSubForLink(sub);
    setSelectedUserId("");
    setLinkDialogOpen(true);
  };

  const handleExpireSubscription = async (subId: string) => {
    if (!confirm("Expire this subscription? This action cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired', expires_at: new Date().toISOString() })
        .eq('id', subId);

      if (error) throw error;
      toast.success("Subscription expired");
      await fetchAllSubscriptions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to expire subscription";
      toast.error(message);
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
      await fetchAllSubscriptions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to extend subscription";
      toast.error(message);
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
    if (sub.user_id && sub.registration_status === 'registered') {
      return 'Linked';
    }
    if (sub.registration_status === 'pending') {
      return 'Paystack (Unlinked)';
    }
    return 'Manual';
  };

  return (
    <div className="space-y-6">
      {/* Main Subscription Manager Card */}
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
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAllData}
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
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
            
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="2_weeks">2 Weeks</SelectItem>
                <SelectItem value="1_month">1 Month</SelectItem>
                <SelectItem value="6_months">6 Months</SelectItem>
                <SelectItem value="yearly">1 Year</SelectItem>
              </SelectContent>
            </Select>
            
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

        {/* Results Count + Bulk Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <p className="text-sm text-muted-foreground">
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
          </p>
          
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg w-full sm:w-auto">
              <span className="text-sm font-medium text-foreground">
                {selectedPendingCount} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkActivate}
                disabled={bulkActivating || selectedPendingCount === 0}
                className="h-7"
              >
                {bulkActivating ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Bulk Activate
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-7"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Subscription Table - Desktop */}
        <div className="hidden lg:block">
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
                    <TableHead className="w-[50px]">
                      {pendingSubscriptions.length > 0 && (
                        <Checkbox
                          checked={allPendingSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all pending"
                        />
                      )}
                    </TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right min-w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => {
                    const status = getSubscriptionStatus(sub);
                    const displayEmail = sub.profile?.email || sub.payment_email || 'Unknown';
                    const isUnregistered = !sub.user_id;
                    const isPending = status === 'pending';
                    const isSelected = selectedIds.has(sub.id);
                    
                    return (
                      <TableRow 
                        key={sub.id}
                        className={cn(
                          status === 'pending' && "bg-warning/5",
                          status === 'expired' && "opacity-70",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <TableCell>
                          {isPending ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectOne(sub.id)}
                              aria-label={`Select ${displayEmail}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </TableCell>
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
                            {format(new Date(sub.expires_at), "PP")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {getSource(sub)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {status === 'pending' && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => handleActivateSubscription(sub.id, sub.payment_email)}
                                  disabled={activating}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Activate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => openLinkDialog(sub)}
                                >
                                  <LinkIcon className="h-3 w-3 mr-1" />
                                  Link User
                                </Button>
                              </>
                            )}
                            {(status === 'active' || status === 'pending') && (
                              <>
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
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Subscription Cards - Mobile/Tablet */}
        <div className="lg:hidden">
          <ScrollArea className="h-[500px]">
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
              <div className="space-y-3">
                {filteredSubscriptions.map((sub) => {
                  const status = getSubscriptionStatus(sub);
                  const displayEmail = sub.profile?.email || sub.payment_email || 'Unknown';
                  const isUnregistered = !sub.user_id;
                  const isPending = status === 'pending';
                  const isSelected = selectedIds.has(sub.id);
                  
                  return (
                    <div 
                      key={sub.id}
                      className={cn(
                        "border border-border rounded-lg p-4 bg-card",
                        status === 'pending' && "border-warning/50 bg-warning/5",
                        status === 'expired' && "opacity-70",
                        isSelected && "border-primary bg-primary/10"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isPending && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectOne(sub.id)}
                              aria-label={`Select ${displayEmail}`}
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {displayEmail}
                            </p>
                            {isUnregistered && (
                              <span className="text-xs text-warning flex items-center gap-1 mt-0.5">
                                <UserPlus className="h-3 w-3" />
                                Unregistered
                              </span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(status)}
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground text-xs">Plan</span>
                          <div className="mt-0.5">
                            <Badge variant="outline" className="capitalize text-xs">
                              {PLAN_LABELS[sub.plan_type] || sub.plan_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Amount</span>
                          <p className="font-medium text-foreground mt-0.5">
                            {formatAmount(sub.plan_type)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Start Date</span>
                          <p className="text-foreground mt-0.5">
                            {format(new Date(sub.started_at), "PP")}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Expiry</span>
                          <p className={cn(
                            "mt-0.5",
                            status === 'expired' ? "text-destructive" : "text-foreground"
                          )}>
                            {format(new Date(sub.expires_at), "PP")}
                          </p>
                        </div>
                      </div>

                      {/* Source */}
                      <div className="text-xs text-muted-foreground mb-3">
                        Source: {getSource(sub)}
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                        {status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-9 text-xs w-full"
                              onClick={() => handleActivateSubscription(sub.id, sub.payment_email)}
                              disabled={activating}
                            >
                              <Check className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">Activate</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs w-full"
                              onClick={() => openLinkDialog(sub)}
                            >
                              <LinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">Link User</span>
                            </Button>
                          </>
                        )}
                        {(status === 'active' || status === 'pending') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-xs w-full"
                              onClick={() => handleExtendSubscription(sub.id, sub.expires_at)}
                            >
                              <span className="truncate">+1 Month</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-9 text-xs w-full"
                              onClick={() => handleExpireSubscription(sub.id)}
                            >
                              <span className="truncate">Expire</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Registered Users Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Registered Users ({registeredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {registeredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                No registered users found
              </div>
            ) : (
              <div className="space-y-2">
                {registeredUsers.map((user) => {
                  const hasSubscription = subscriptions.some(s => s.user_id === user.id && getSubscriptionStatus(s) === 'active');
                  return (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {user.display_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {format(new Date(user.created_at), "PP")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasSubscription ? (
                          <Badge className="bg-success text-success-foreground text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Free
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Link User Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Subscription to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSubForLink && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium">Subscription Email:</p>
                <p className="text-sm text-muted-foreground">{selectedSubForLink.payment_email}</p>
                <p className="text-sm font-medium mt-2">Plan:</p>
                <p className="text-sm text-muted-foreground">
                  {PLAN_LABELS[selectedSubForLink.plan_type] || selectedSubForLink.plan_type}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Registered User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user to link" />
                </SelectTrigger>
                <SelectContent>
                  {registeredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleLinkToUser} className="w-full" disabled={!selectedUserId}>
              Link Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
