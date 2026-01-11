import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarIcon, Save, X, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  id: string;
  match_name: string;
  team_a: string | null;
  team_b: string | null;
  prediction_text: string;
  odds: number;
  confidence: number;
  match_date: string;
  sport_category: string | null;
  result: string | null;
}

interface Bundle {
  id: string;
  name: string;
  booking_code: string | null;
  betting_platform: string | null;
  prediction_type: string;
  total_odds: number;
  predictions: Prediction[];
}

interface EditBundleDialogProps {
  bundle: Bundle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export const EditBundleDialog = ({ bundle, open, onOpenChange, onSave }: EditBundleDialogProps) => {
  const [bookingCode, setBookingCode] = useState("");
  const [bettingPlatform, setBettingPlatform] = useState("football.com");
  const [predictionType, setPredictionType] = useState("free");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // New prediction form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeamA, setNewTeamA] = useState("");
  const [newTeamB, setNewTeamB] = useState("");
  const [newPredictionText, setNewPredictionText] = useState("");
  const [newOdds, setNewOdds] = useState("");
  const [newConfidence, setNewConfidence] = useState("");
  const [newMatchDate, setNewMatchDate] = useState<Date>(new Date());
  const [newSportCategory, setNewSportCategory] = useState("football");

  useEffect(() => {
    if (bundle) {
      setBookingCode(bundle.booking_code || "");
      setBettingPlatform(bundle.betting_platform || "football.com");
      setPredictionType(bundle.prediction_type || "free");
      setPredictions(bundle.predictions || []);
    }
  }, [bundle]);

  const handlePredictionChange = (index: number, field: keyof Prediction, value: string | number) => {
    const updated = [...predictions];
    if (field === 'team_a' || field === 'team_b') {
      updated[index] = { 
        ...updated[index], 
        [field]: value as string,
        match_name: field === 'team_a' 
          ? `${value} vs ${updated[index].team_b || ''}` 
          : `${updated[index].team_a || ''} vs ${value}`
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setPredictions(updated);
  };

  const handleDeletePrediction = async (predictionId: string) => {
    if (predictions.length <= 1) {
      toast.error("Bundle must have at least one prediction. Delete the bundle instead.");
      return;
    }

    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('id', predictionId);

    if (error) {
      toast.error("Failed to delete prediction");
      return;
    }

    setPredictions(predictions.filter(p => p.id !== predictionId));
    toast.success("Prediction removed");
  };

  const handleAddNewPrediction = async () => {
    if (!bundle) return;

    if (!newTeamA.trim() || !newTeamB.trim() || !newPredictionText.trim() || !newOdds) {
      toast.error("Please fill in all required fields");
      return;
    }

    const odds = parseFloat(newOdds);
    if (isNaN(odds) || odds < 1.01 || odds > 100) {
      toast.error("Odds must be between 1.01 and 100");
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) return;

    const { data: newPred, error } = await supabase
      .from('predictions')
      .insert({
        bundle_id: bundle.id,
        match_name: `${newTeamA.trim()} vs ${newTeamB.trim()}`,
        team_a: newTeamA.trim(),
        team_b: newTeamB.trim(),
        prediction_text: newPredictionText.trim(),
        odds: odds,
        confidence: parseInt(newConfidence) || 0,
        match_date: newMatchDate.toISOString().split('T')[0],
        sport_category: newSportCategory,
        prediction_type: predictionType,
        created_by: session.session.user.id,
        result: 'pending'
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add prediction");
      return;
    }

    setPredictions([...predictions, newPred]);
    setShowAddForm(false);
    setNewTeamA("");
    setNewTeamB("");
    setNewPredictionText("");
    setNewOdds("");
    setNewConfidence("");
    setNewMatchDate(new Date());
    toast.success("Prediction added");
  };

  const calculateTotalOdds = () => {
    return predictions.reduce((acc, pred) => acc * (Number(pred.odds) || 1), 1);
  };

  const handleSave = async () => {
    if (!bundle) return;

    setIsSaving(true);
    try {
      // Update bundle
      const totalOdds = calculateTotalOdds();
      const bundleName = predictions
        .map(p => `${p.team_a || ''} vs ${p.team_b || ''}`)
        .join(", ")
        .substring(0, 500);

      const { error: bundleError } = await supabase
        .from('prediction_bundles')
        .update({
          booking_code: bookingCode.trim() || null,
          betting_platform: bettingPlatform,
          prediction_type: predictionType,
          total_odds: totalOdds,
          name: bundleName,
        })
        .eq('id', bundle.id);

      if (bundleError) {
        toast.error("Failed to update bundle");
        return;
      }

      // Update each prediction
      for (const pred of predictions) {
        const { error: predError } = await supabase
          .from('predictions')
          .update({
            team_a: pred.team_a,
            team_b: pred.team_b,
            match_name: `${pred.team_a || ''} vs ${pred.team_b || ''}`,
            prediction_text: pred.prediction_text,
            odds: Number(pred.odds),
            confidence: Number(pred.confidence),
            match_date: pred.match_date,
            sport_category: pred.sport_category,
            prediction_type: predictionType,
          })
          .eq('id', pred.id);

        if (predError) {
          console.error("Failed to update prediction:", predError);
        }
      }

      toast.success("Bundle updated successfully!");
      onSave();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Prediction Bundle</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bundle Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="edit-bookingCode" className="text-sm">Booking Code</Label>
              <Input
                id="edit-bookingCode"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="Enter booking code"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-platform" className="text-sm">Platform</Label>
              <Select value={bettingPlatform} onValueChange={setBettingPlatform}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football.com">Football.com</SelectItem>
                  <SelectItem value="sportybet">Sporty Bet</SelectItem>
                  <SelectItem value="betano">Betano</SelectItem>
                  <SelectItem value="bet9ja">Bet9ja</SelectItem>
                  <SelectItem value="betgr8">Betgr8</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type" className="text-sm">Type</Label>
              <Select value={predictionType} onValueChange={setPredictionType}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Predictions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-foreground">Predictions ({predictions.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Prediction
              </Button>
            </div>

            {/* Add New Prediction Form */}
            {showAddForm && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4 space-y-3">
                <h5 className="font-semibold text-sm">Add New Prediction</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Team A</Label>
                    <Input
                      value={newTeamA}
                      onChange={(e) => setNewTeamA(e.target.value)}
                      placeholder="e.g., Barcelona"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Team B</Label>
                    <Input
                      value={newTeamB}
                      onChange={(e) => setNewTeamB(e.target.value)}
                      placeholder="e.g., Real Madrid"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prediction</Label>
                    <Input
                      value={newPredictionText}
                      onChange={(e) => setNewPredictionText(e.target.value)}
                      placeholder="e.g., Over 2.5"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Odds</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newOdds}
                      onChange={(e) => setNewOdds(e.target.value)}
                      placeholder="e.g., 1.85"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Confidence</Label>
                    <Input
                      type="number"
                      value={newConfidence}
                      onChange={(e) => setNewConfidence(e.target.value)}
                      placeholder="0-100"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Match Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm h-9",
                            !newMatchDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newMatchDate ? format(newMatchDate, "PP") : <span>Pick date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newMatchDate}
                          onSelect={(date) => date && setNewMatchDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sport</Label>
                    <Select value={newSportCategory} onValueChange={setNewSportCategory}>
                      <SelectTrigger className="text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="tennis">Tennis</SelectItem>
                        <SelectItem value="cricket">Cricket</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleAddNewPrediction}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Predictions */}
            <div className="space-y-3">
              {predictions.map((pred, index) => (
                <div key={pred.id} className="p-4 bg-background border border-border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs text-muted-foreground">Prediction #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePrediction(pred.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Team A</Label>
                      <Input
                        value={pred.team_a || ""}
                        onChange={(e) => handlePredictionChange(index, 'team_a', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Team B</Label>
                      <Input
                        value={pred.team_b || ""}
                        onChange={(e) => handlePredictionChange(index, 'team_b', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Prediction</Label>
                      <Input
                        value={pred.prediction_text}
                        onChange={(e) => handlePredictionChange(index, 'prediction_text', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Odds</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pred.odds}
                        onChange={(e) => handlePredictionChange(index, 'odds', parseFloat(e.target.value) || 1)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Confidence</Label>
                      <Input
                        type="number"
                        value={pred.confidence}
                        onChange={(e) => handlePredictionChange(index, 'confidence', parseInt(e.target.value) || 0)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Match Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal text-sm h-9"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {pred.match_date ? format(new Date(pred.match_date), "PP") : "Pick date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={pred.match_date ? new Date(pred.match_date) : undefined}
                            onSelect={(date) => date && handlePredictionChange(index, 'match_date', date.toISOString().split('T')[0])}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sport</Label>
                      <Select 
                        value={pred.sport_category || "football"} 
                        onValueChange={(value) => handlePredictionChange(index, 'sport_category', value)}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="football">Football</SelectItem>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="tennis">Tennis</SelectItem>
                          <SelectItem value="cricket">Cricket</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Odds Preview */}
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <span className="font-semibold">Total Combined Odds:</span>
            <span className="text-xl font-bold text-primary">{calculateTotalOdds().toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

