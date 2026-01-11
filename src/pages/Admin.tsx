import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FullPageState } from "@/components/FullPageState";
import { toast } from "sonner";
import { PredictionBuilder, PredictionFormData } from "@/components/PredictionBuilder";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { CommentManager } from "@/components/CommentManager";
import { EditBundleDialog } from "@/components/EditBundleDialog";
import { z } from "zod";
import { sendNotificationEmail, getUserEmail } from "@/hooks/useEmailNotifications";
import { Pencil } from "lucide-react";

// Validation schema for predictions
const predictionSchema = z.object({
  teamA: z.string().trim().min(2, "Team A must be at least 2 characters").max(100, "Team A must be less than 100 characters"),
  teamB: z.string().trim().min(2, "Team B must be at least 2 characters").max(100, "Team B must be less than 100 characters"),
  predictionText: z.string().trim().min(1, "Prediction cannot be empty").max(200, "Prediction must be less than 200 characters"),
  odds: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1.01 && num <= 100;
  }, "Odds must be between 1.01 and 100"),
  confidence: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Confidence must be between 0 and 100"),
  sportCategory: z.enum(['football', 'basketball', 'tennis', 'cricket', 'other'], {
    errorMap: () => ({ message: "Invalid sport category" })
  }),
  matchDate: z.date({ required_error: "Match date is required" })
});

const bundleSchema = z.object({
  predictions: z.array(predictionSchema).min(1, "At least one prediction is required"),
  predictionType: z.enum(['free', 'vip'], {
    errorMap: () => ({ message: "Prediction type must be 'free' or 'vip'" })
  })
});

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    fetchUsers();
    fetchBundles();
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setUsers(data);
      fetchUserRoles(data.map(u => u.id));
    }
  };

  const fetchUserRoles = async (userIds: string[]) => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    if (data) {
      const rolesMap: Record<string, string[]> = {};
      data.forEach(({ user_id, role }) => {
        if (!rolesMap[user_id]) rolesMap[user_id] = [];
        rolesMap[user_id].push(role);
      });
      setUserRoles(rolesMap);
    }
  };

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast.error("Failed to remove admin role");
      } else {
        toast.success("Admin role removed");
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        toast.error("Failed to add admin role");
      } else {
        toast.success("Admin role added");
        fetchUsers();
      }
    }
  };

  const fetchBundles = async () => {
    const { data } = await supabase
      .from('prediction_bundles')
      .select(`
        *,
        predictions (*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setBundles(data);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    const { error } = await supabase
      .from('prediction_bundles')
      .delete()
      .eq('id', bundleId);

    if (error) {
      toast.error("Failed to delete prediction bundle");
    } else {
      toast.success("Prediction bundle deleted successfully!");
      fetchBundles();
    }
  };

  const handleUpdatePredictionResult = async (predictionId: string, result: string) => {
    const { error } = await supabase
      .from('predictions')
      .update({ result })
      .eq('id', predictionId);

    if (error) {
      toast.error("Failed to update prediction result");
    } else {
      toast.success("Prediction result updated!");
      fetchBundles();
    }
  };

  const handleUpdateBundleStatus = async (bundleId: string, finalStatus: string) => {
    const { error } = await supabase
      .from('prediction_bundles')
      .update({ final_status: finalStatus })
      .eq('id', bundleId);

    if (error) {
      toast.error("Failed to update bundle status");
    } else {
      toast.success("Bundle status updated!");
      fetchBundles();
    }
  };

  const handleAddPredictions = async (predictions: PredictionFormData[], predictionType: string, bookingCode: string, bettingPlatform: string) => {
    // Validate input data
    try {
      bundleSchema.parse({ predictions, predictionType });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(`Validation error: ${firstError.message}`);
        console.error("Validation errors:", error.errors);
        return;
      }
      toast.error("Invalid prediction data");
      return;
    }

    // Calculate total odds
    const totalOdds = predictions.reduce((acc, pred) => acc * parseFloat(pred.odds), 1);
    
    // Create bundle name from predictions (sanitized)
    const bundleName = predictions
      .map(p => `${p.teamA.trim()} vs ${p.teamB.trim()}`)
      .join(", ")
      .substring(0, 500); // Limit bundle name length

    // Insert bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('prediction_bundles')
      .insert({
        name: bundleName,
        total_odds: totalOdds,
        prediction_type: predictionType,
        created_by: user.id,
        booking_code: bookingCode.trim() || null,
        betting_platform: bettingPlatform,
      })
      .select()
      .single();

    if (bundleError || !bundle) {
      console.error("Bundle creation error:", bundleError);
      toast.error("Failed to create prediction bundle");
      return;
    }

    // Insert all predictions with validated data
    const predictionInserts = predictions.map(pred => ({
      bundle_id: bundle.id,
      match_name: `${pred.teamA.trim()} vs ${pred.teamB.trim()}`.substring(0, 200),
      team_a: pred.teamA.trim().substring(0, 100),
      team_b: pred.teamB.trim().substring(0, 100),
      prediction_text: pred.predictionText.trim().substring(0, 200),
      odds: parseFloat(pred.odds),
      confidence: parseInt(pred.confidence),
      match_date: pred.matchDate.toISOString().split('T')[0],
      sport_category: pred.sportCategory,
      prediction_type: predictionType,
      created_by: user.id,
    }));

    const { error: predictionsError } = await supabase
      .from('predictions')
      .insert(predictionInserts);

    if (predictionsError) {
      console.error("Predictions insertion error:", predictionsError);
      toast.error("Failed to add predictions");
      // Clean up bundle if predictions failed
      await supabase.from('prediction_bundles').delete().eq('id', bundle.id);
    } else {
      toast.success("Prediction bundle added successfully!");
      fetchBundles();
      
      // Send email notifications to followers for free predictions
      if (predictionType === 'free') {
        const { data: followers } = await supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', user.id);
        
        if (followers && followers.length > 0) {
          const adminInfo = await getUserEmail(user.id);
          const predictionTitle = predictions[0] 
            ? `${predictions[0].teamA} vs ${predictions[0].teamB}` 
            : 'New Prediction';
          
          // Send emails to all followers (limit to first 10 for performance)
          for (const follower of followers.slice(0, 10)) {
            const followerInfo = await getUserEmail(follower.follower_id);
            if (followerInfo && adminInfo) {
              sendNotificationEmail({
                type: "new_prediction",
                recipientEmail: followerInfo.email,
                recipientName: followerInfo.displayName,
                actorName: adminInfo.displayName,
                predictionTitle,
              });
            }
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <FullPageState
        title="Admin access required"
        description="You don't have permission to view this page."
        variant="info"
        action={{ label: "Go Home", to: "/", variant: "outline" }}
      />
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">Admin Panel</h2>

        <div className="mb-6">
          <PredictionBuilder onSubmit={handleAddPredictions} />
        </div>

        <div className="mb-6">
          <SubscriptionManager />
        </div>

        <div className="mb-6">
          <CommentManager />
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">Manage Prediction Bundles</h3>
          <div className="space-y-4 sm:space-y-6">
            {bundles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No prediction bundles yet</p>
            ) : (
              bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="p-3 sm:p-6 bg-background border-2 border-border rounded-lg"
                >
                  {/* Bundle Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 pb-4 border-b border-border">
                    <div className="flex-1 min-w-0">
                      {bundle.booking_code && (
                        <div className="mb-2 text-xs sm:text-sm">
                          <span className="text-muted-foreground">Code: </span>
                          <span className="font-mono font-bold text-primary">{bundle.booking_code}</span>
                          <span className="text-muted-foreground ml-2">on</span>
                          <span className="font-semibold text-foreground ml-1">{bundle.betting_platform || 'football.com'}</span>
                        </div>
                      )}
                      <div className="font-bold text-foreground text-base sm:text-xl mb-2">
                        Package #{bundle.id.slice(0, 8)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                        <span className="font-semibold">
                          {bundle.prediction_type === 'vip' ? '🔒 VIP' : '🆓 Free'}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(bundle.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setEditingBundle(bundle);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleDeleteBundle(bundle.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {/* Fixture List & Results - Mobile Card View */}
                  <div className="mb-4">
                    <h4 className="font-bold text-foreground mb-3 text-sm sm:text-base">Fixture List & Results</h4>
                    
                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-semibold text-foreground">Match</th>
                            <th className="text-left py-2 px-2 font-semibold text-foreground">Prediction</th>
                            <th className="text-left py-2 px-2 font-semibold text-foreground">Odds</th>
                            <th className="text-left py-2 px-2 font-semibold text-foreground">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bundle.predictions?.map((pred: any) => (
                            <tr key={pred.id} className="border-b border-border">
                              <td className="py-3 px-2 text-foreground">{pred.match_name}</td>
                              <td className="py-3 px-2 text-muted-foreground">
                                ✅ {pred.prediction_text}
                              </td>
                              <td className="py-3 px-2 text-foreground font-semibold">
                                {parseFloat(pred.odds).toFixed(2)}
                              </td>
                              <td className="py-3 px-2">
                                <select
                                  value={pred.result || 'pending'}
                                  onChange={(e) => handleUpdatePredictionResult(pred.id, e.target.value)}
                                  className="px-3 py-1 border border-border rounded bg-background text-foreground text-xs font-semibold"
                                >
                                  <option value="pending">PENDING</option>
                                  <option value="won">WON</option>
                                  <option value="lost">LOST</option>
                                  <option value="postponed">POSTPONED</option>
                                  <option value="void">VOID</option>
                                  <option value="canceled">CANCELED</option>
                                </select>
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
                          <div className="flex flex-wrap gap-2 text-xs mb-2">
                            <span className="text-muted-foreground">✅ {pred.prediction_text}</span>
                            <span className="font-semibold text-primary">@ {parseFloat(pred.odds).toFixed(2)}</span>
                          </div>
                          <select
                            value={pred.result || 'pending'}
                            onChange={(e) => handleUpdatePredictionResult(pred.id, e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-xs font-semibold"
                          >
                            <option value="pending">PENDING</option>
                            <option value="won">WON</option>
                            <option value="lost">LOST</option>
                            <option value="postponed">POSTPONED</option>
                            <option value="void">VOID</option>
                            <option value="canceled">CANCELED</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Package Summary */}
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-bold text-foreground mb-3 text-sm sm:text-base">Package Summary</h4>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
                      <span className="text-sm sm:text-lg font-semibold text-foreground">Total Combined Odds:</span>
                      <span className="text-xl sm:text-2xl font-bold text-primary">
                        {parseFloat(bundle.total_odds).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-3 border-t border-border">
                      <span className="font-semibold text-foreground text-sm">Final Package Status:</span>
                      <select
                        value={bundle.final_status || 'pending'}
                        onChange={(e) => handleUpdateBundleStatus(bundle.id, e.target.value)}
                        className="px-4 py-2 border border-border rounded bg-background text-foreground font-bold text-sm"
                      >
                        <option value="pending">PENDING</option>
                        <option value="won">WON</option>
                        <option value="lost">LOST</option>
                        <option value="postponed">POSTPONED</option>
                        <option value="void">VOID</option>
                        <option value="canceled">CANCELED</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4">Registered Members</h3>
          <div className="space-y-2">
            {users.map((user) => {
              const isAdmin = userRoles[user.id]?.includes('admin');
              return (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-background border border-border rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-sm sm:text-base truncate">{user.email}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                      {isAdmin && <span className="ml-2 text-primary font-semibold">• Admin</span>}
                    </div>
                  </div>
                  <Button
                    variant={isAdmin ? "destructive" : "default"}
                    size="sm"
                    className="self-end sm:self-center text-xs"
                    onClick={() => toggleAdminRole(user.id, isAdmin)}
                  >
                    {isAdmin ? "Remove Admin" : "Make Admin"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Bundle Dialog */}
      <EditBundleDialog
        bundle={editingBundle}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={fetchBundles}
      />
    </div>
  );
}