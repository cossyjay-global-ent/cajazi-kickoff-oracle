import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import { MultiPlatformBookingCodes, PlatformBookingCode } from "@/components/MultiPlatformBookingCodes";

// Validation schema for individual predictions
const predictionFormSchema = z.object({
  teamA: z.string().trim().min(2, "Team A must be at least 2 characters").max(100, "Team A must be less than 100 characters"),
  teamB: z.string().trim().min(2, "Team B must be at least 2 characters").max(100, "Team B must be less than 100 characters"),
  predictionText: z.string().trim().min(1, "Prediction cannot be empty").max(200, "Prediction must be less than 200 characters"),
  odds: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 1.01 && num <= 100;
  }, "Odds must be between 1.01 and 100"),
  confidence: z.string().refine((val) => {
    if (!val) return true; // Optional
    const num = parseInt(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Confidence must be between 0 and 100"),
});

export interface PredictionFormData {
  id: string;
  teamA: string;
  teamB: string;
  predictionText: string;
  odds: string;
  confidence: string;
  matchDate: Date;
  sportCategory: string;
}

export interface PlatformCodeData {
  platform: string;
  bookingCode: string;
}

export interface InitialBundleData {
  id: string;
  prediction_type: string;
  predictions?: Array<{
    id: string;
    team_a: string;
    team_b: string;
    prediction_text: string;
    odds: number;
    confidence: number;
    match_date: string;
    sport_category: string;
  }>;
  prediction_booking_codes?: Array<{
    platform: string;
    booking_code: string;
  }>;
  booking_code?: string;
  betting_platform?: string;
}

interface PredictionBuilderProps {
  onSubmit: (
    predictions: PredictionFormData[], 
    predictionType: string, 
    platformCodes: PlatformCodeData[]
  ) => Promise<void>;
  initialBundle?: InitialBundleData | null;
  onClearInitialBundle?: () => void;
}

export const PredictionBuilder = ({ onSubmit, initialBundle, onClearInitialBundle }: PredictionBuilderProps) => {
  const [predictions, setPredictions] = useState<PredictionFormData[]>([]);
  const [predictionType, setPredictionType] = useState("free");
  const [platformCodes, setPlatformCodes] = useState<PlatformBookingCode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRePredicting, setIsRePredicting] = useState(false);
  
  // Current form state
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [predictionText, setPredictionText] = useState("");
  const [odds, setOdds] = useState("");
  const [confidence, setConfidence] = useState("");
  const [matchDate, setMatchDate] = useState<Date>(new Date());
  const [sportCategory, setSportCategory] = useState("football");

  // Load initial bundle data for re-prediction
  useEffect(() => {
    if (initialBundle) {
      // Convert bundle predictions to form format
      const formPredictions: PredictionFormData[] = (initialBundle.predictions || []).map(pred => ({
        id: Math.random().toString(36).substr(2, 9), // New ID for the clone
        teamA: pred.team_a || "",
        teamB: pred.team_b || "",
        predictionText: pred.prediction_text || "",
        odds: pred.odds?.toString() || "1.00",
        confidence: pred.confidence?.toString() || "0",
        matchDate: new Date(), // Use current date for new prediction
        sportCategory: pred.sport_category || "football",
      }));
      
      setPredictions(formPredictions);
      setPredictionType(initialBundle.prediction_type || "free");
      
      // Load booking codes
      const codes: PlatformBookingCode[] = [];
      if (initialBundle.prediction_booking_codes && initialBundle.prediction_booking_codes.length > 0) {
        initialBundle.prediction_booking_codes.forEach(code => {
          codes.push({
            id: Math.random().toString(36).substr(2, 9),
            platform: code.platform,
            bookingCode: code.booking_code,
          });
        });
      } else if (initialBundle.booking_code) {
        // Fallback to legacy fields
        codes.push({
          id: Math.random().toString(36).substr(2, 9),
          platform: initialBundle.betting_platform || "football.com",
          bookingCode: initialBundle.booking_code,
        });
      }
      setPlatformCodes(codes);
      setIsRePredicting(true);
    }
  }, [initialBundle]);

  const handleClearRePrediction = () => {
    setPredictions([]);
    setPlatformCodes([]);
    setPredictionType("free");
    setIsRePredicting(false);
    onClearInitialBundle?.();
  };

  const totalOdds = predictions.reduce((acc, pred) => acc * parseFloat(pred.odds || "1"), 1);

  const addPrediction = () => {
    // Validate input
    try {
      predictionFormSchema.parse({
        teamA,
        teamB,
        predictionText,
        odds,
        confidence,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    const newPrediction: PredictionFormData = {
      id: Math.random().toString(36).substr(2, 9),
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      predictionText: predictionText.trim(),
      odds: odds || "1.00",
      confidence: confidence || "0",
      matchDate,
      sportCategory,
    };

    setPredictions([...predictions, newPrediction]);
    
    // Reset form
    setTeamA("");
    setTeamB("");
    setPredictionText("");
    setOdds("");
    setConfidence("");
    setMatchDate(new Date());
    
    toast.success("Prediction added to bundle");
  };

  const removePrediction = (id: string) => {
    setPredictions(predictions.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setPredictions([]);
  };

  const handleSubmit = async () => {
    if (predictions.length === 0) {
      toast.error("Add at least one prediction");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const codesData = platformCodes.map(c => ({
        platform: c.platform,
        bookingCode: c.bookingCode,
      }));
      await onSubmit(predictions, predictionType, codesData);
      setPredictions([]);
      setPlatformCodes([]);
      setIsRePredicting(false);
      onClearInitialBundle?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Re-Prediction Banner */}
      {isRePredicting && (
        <div className="lg:col-span-2 bg-primary/10 border border-primary/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-primary font-semibold text-sm sm:text-base">📋 Re-Prediction Mode</span>
            <span className="text-muted-foreground text-xs sm:text-sm">Modify the cloned bundle and submit as new</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearRePrediction}
            className="self-end sm:self-center text-xs"
          >
            Cancel Re-Prediction
          </Button>
        </div>
      )}
      
      {/* Prediction Builder Section - Left Side */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Prediction Builder</h3>
        
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="teamA" className="text-xs sm:text-sm">Team A</Label>
              <Input
                id="teamA"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="e.g., Barcelona"
                maxLength={100}
                className="text-sm"
              />
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="teamB" className="text-xs sm:text-sm">Team B</Label>
              <Input
                id="teamB"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="e.g., Real Madrid"
                maxLength={100}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="prediction" className="text-xs sm:text-sm">Prediction</Label>
            <Input
              id="prediction"
              value={predictionText}
              onChange={(e) => setPredictionText(e.target.value)}
              placeholder="e.g., 1X, Over 2.5, BTTS"
              maxLength={200}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="odds" className="text-xs sm:text-sm">Odds</Label>
              <Input
                id="odds"
                type="number"
                step="0.01"
                min="1.01"
                max="100"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                placeholder="e.g., 2.00"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="confidence" className="text-xs sm:text-sm">Confidence (0-100)</Label>
              <Input
                id="confidence"
                type="number"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                placeholder="e.g., 85"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Match Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs sm:text-sm h-9 sm:h-10",
                      !matchDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {matchDate ? format(matchDate, "PP") : <span>Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={matchDate}
                    onSelect={(date) => date && setMatchDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="sport" className="text-xs sm:text-sm">Sport</Label>
              <Select value={sportCategory} onValueChange={setSportCategory}>
                <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
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

          <Button 
            onClick={addPrediction} 
            className="w-full text-sm"
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add to Bundle
          </Button>
        </div>
      </div>

      {/* Current Predictions Preview - Right Side */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-xl font-bold text-foreground">
            {isRePredicting ? "Re-Prediction Preview" : "Current Predictions"}
          </h3>
          {predictions.length > 0 && (
            <Button onClick={clearAll} variant="outline" size="sm" className="text-xs h-7 sm:h-8">
              Clear All
            </Button>
          )}
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-sm">No predictions added yet</p>
            <p className="text-xs mt-1.5 sm:mt-2">Add matches using the form</p>
          </div>
        ) : (
          <>
            {/* Multi-Platform Booking Codes - At the Top */}
            <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
              <MultiPlatformBookingCodes
                codes={platformCodes}
                onChange={setPlatformCodes}
              />
            </div>

            <div className="space-y-2 mb-3 sm:mb-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  className="flex justify-between items-start p-2.5 sm:p-3 bg-background border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">
                      {pred.teamA} vs {pred.teamB}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {pred.predictionText} @ {pred.odds}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrediction(pred.id)}
                    className="ml-2 h-7 w-7 p-0 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">Total Odds:</span>
                <span className="text-lg sm:text-xl font-bold text-primary">{totalOdds.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Type</Label>
                <Select value={predictionType} onValueChange={setPredictionType}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free Prediction</SelectItem>
                    <SelectItem value="vip">VIP Prediction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full text-sm" 
                size="default"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : isRePredicting ? "Submit as New Prediction" : "Add to Predictions"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
