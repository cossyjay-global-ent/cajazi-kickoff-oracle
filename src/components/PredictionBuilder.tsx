import { useState } from "react";
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

export interface PredictionFormData {
  id: string;
  teamA: string;
  teamB: string;
  predictionText: string;
  odds: string;
  confidence: string;
  matchDate: Date;
  sportCategory: string;
  bookingCode?: string;
}

interface PredictionBuilderProps {
  onSubmit: (predictions: PredictionFormData[], predictionType: string, bookingCode: string, bettingPlatform: string) => Promise<void>;
}

export const PredictionBuilder = ({ onSubmit }: PredictionBuilderProps) => {
  const [predictions, setPredictions] = useState<PredictionFormData[]>([]);
  const [predictionType, setPredictionType] = useState("free");
  const [bookingCode, setBookingCode] = useState("");
  const [bettingPlatform, setBettingPlatform] = useState("football.com");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Current form state
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [predictionText, setPredictionText] = useState("");
  const [odds, setOdds] = useState("");
  const [confidence, setConfidence] = useState("");
  const [matchDate, setMatchDate] = useState<Date>(new Date());
  const [sportCategory, setSportCategory] = useState("football");

  const totalOdds = predictions.reduce((acc, pred) => acc * parseFloat(pred.odds || "1"), 1);

  const addPrediction = () => {
    const newPrediction: PredictionFormData = {
      id: Math.random().toString(36).substr(2, 9),
      teamA: teamA.trim() || "",
      teamB: teamB.trim() || "",
      predictionText: predictionText.trim() || "",
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
    if (predictions.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(predictions, predictionType, bookingCode, bettingPlatform);
      setPredictions([]);
      setBookingCode("");
      setBettingPlatform("football.com");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Prediction Builder Section - Left Side */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-bold text-foreground mb-4">Prediction Builder</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teamA">Team A</Label>
              <Input
                id="teamA"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="e.g., Barcelona"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="teamB">Team B</Label>
              <Input
                id="teamB"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="e.g., Real Madrid"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prediction">Prediction</Label>
            <Input
              id="prediction"
              value={predictionText}
              onChange={(e) => setPredictionText(e.target.value)}
              placeholder="e.g., 1X, Over 2.5, Both Teams to Score"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odds" className="text-sm">Odds</Label>
              <Input
                id="odds"
                type="number"
                step="0.01"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                placeholder="e.g., 2.00"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence" className="text-sm">Confidence (0-100)</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Match Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !matchDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {matchDate ? format(matchDate, "PPP") : <span>Pick a date</span>}
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

            <div className="space-y-2">
              <Label htmlFor="sport" className="text-sm">Sport Category</Label>
              <Select value={sportCategory} onValueChange={setSportCategory}>
                <SelectTrigger className="text-sm">
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
            className="w-full"
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Match to Bundle
          </Button>
        </div>
      </div>

      {/* Current Predictions Preview - Right Side */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">Current Predictions</h3>
          {predictions.length > 0 && (
            <Button onClick={clearAll} variant="outline" size="sm" className="text-xs">
              Clear All
            </Button>
          )}
        </div>

        {predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No predictions added yet</p>
            <p className="text-sm mt-2">Add matches using the form on the left</p>
          </div>
        ) : (
          <>
            {/* Booking Code and Platform - At the Top */}
            <div className="space-y-3 mb-4 pb-4 border-b border-border">
              <div className="space-y-2">
                <Label htmlFor="bookingCode">Booking Code</Label>
                <Input
                  id="bookingCode"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="Enter booking code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Betting Platform</Label>
                <Select value={bettingPlatform} onValueChange={setBettingPlatform}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="football.com">Football.com</SelectItem>
                    <SelectItem value="sportybet">Sporty Bet</SelectItem>
                    <SelectItem value="betano">Betano</SelectItem>
                    <SelectItem value="bet9ja">Bet9ja</SelectItem>
                    <SelectItem value="betgr8">Betgr8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
              {predictions.map((pred) => (
                <div
                  key={pred.id}
                  className="flex justify-between items-start p-3 bg-background border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {pred.teamA} vs {pred.teamB}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pred.predictionText} @ {pred.odds}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePrediction(pred.id)}
                    className="ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-foreground">Total Odds:</span>
                <span className="text-xl font-bold text-primary">{totalOdds.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Label>Prediction Type</Label>
                <Select value={predictionType} onValueChange={setPredictionType}>
                  <SelectTrigger>
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
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add to Predictions"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
