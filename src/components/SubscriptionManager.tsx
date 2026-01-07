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
import { CalendarIcon, CheckCircle, Clock, XCircle, UserPlus, Mail, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type SubscriptionStatus = 'active_registered' | 'active_pending' | 'expired' | 'cancelled';

export const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
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
      // Fetch ALL subscriptions with profile data
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
    if (sub.registration_status === 'registered' && sub.user_id) return 'active_registered';
    return 'active_pending';
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active_registered':
        return (
          <Badge className="bg-success text-success-foreground text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active (Registered)
          </Badge>
        );
      case 'active_pending':
        return (
          <Badge className="bg-warning text-warning-foreground text-xs">
            <UserPlus className="h-3 w-3 mr-1" />
            Active (Pending Registration)
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
      if (filterStatus === 'active' && !status.startsWith('active')) return false;
      if (filterStatus === 'pending' && status !== 'active_pending') return false;
      if (filterStatus === 'registered' && status !== 'active_registered') return false;
      if (filterStatus === 'expired' && status !== 'expired') return false;
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
    activeRegistered: subscriptions.filter(s => getSubscriptionStatus(s) === 'active_registered').length,
    activePending: subscriptions.filter(s => getSubscriptionStatus(s) === 'active_pending').length,
    expired: subscriptions.filter(s => getSubscriptionStatus(s) === 'expired').length,
  };

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

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground">VIP Subscription Management</h3>
          <p className="text-sm text-muted-foreground mt-1">All subscriptions, including pending registrations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
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
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.activeRegistered}</div>
          <div className="text-xs text-muted-foreground">Active (Registered)</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.activePending}</div>
          <div className="text-xs text-muted-foreground">Pending Registration</div>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
          <div className="text-xs text-muted-foreground">Expired</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'pending', 'registered', 'expired'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="text-xs capitalize"
            >
              {status === 'pending' ? 'Pending Reg.' : status === 'registered' ? 'Registered' : status}
            </Button>
          ))}
        </div>
      </div>

      {/* Subscription List */}
      <ScrollArea className="h-[400px] sm:h-[500px]">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading subscriptions...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchEmail ? 'No subscriptions match your search' : 'No subscriptions found'}
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {filteredSubscriptions.map((sub) => {
              const status = getSubscriptionStatus(sub);
              const displayEmail = sub.profile?.email || sub.payment_email || 'Unknown';
              const isActive = status.startsWith('active');
              
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "p-4 bg-background border rounded-lg",
                    status === 'active_pending' && "border-warning/50",
                    status === 'active_registered' && "border-success/30",
                    status === 'expired' && "border-border opacity-75"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-foreground truncate">{displayEmail}</span>
                        {getStatusBadge(status)}
                      </div>
                      
                      {status === 'active_pending' && sub.payment_email && (
                        <div className="text-xs text-warning mb-2 flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          Payment received - user has not registered yet
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                          {sub.plan_type.replace('_', ' ')}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isActive ? 'Expires' : 'Expired'}: {format(new Date(sub.expires_at), "PP")}
                        </span>
                      </div>
                      
                      {sub.payment_email && sub.profile?.email && sub.payment_email !== sub.profile.email && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Payment email: {sub.payment_email}
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="flex gap-2 self-end sm:self-start">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleExtendSubscription(sub.id, sub.expires_at)}
                        >
                          +1 Month
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleExpireSubscription(sub.id)}
                        >
                          Expire
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
