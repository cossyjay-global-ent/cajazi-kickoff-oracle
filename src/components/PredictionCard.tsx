import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Star } from "lucide-react";
import { useFavoriteToggle } from "@/hooks/usePredictionTracking";

interface PredictionCardProps {
  match: string;
  prediction: string;
  odds: number;
  confidence: number;
  predictionId?: string;
  bundleId?: string | null;
}

export const PredictionCard = ({ match, prediction, odds, confidence, predictionId, bundleId }: PredictionCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { toggleFavorite, checkIsFavorite } = useFavoriteToggle();

  useEffect(() => {
    const checkFavorite = async () => {
      if (predictionId || bundleId) {
        const favorite = await checkIsFavorite(predictionId || null, bundleId || null);
        setIsFavorite(favorite);
      }
    };
    checkFavorite();
  }, [predictionId, bundleId]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = await toggleFavorite(predictionId || null, bundleId || null);
    setIsFavorite(newState);
  };
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="text-lg font-semibold text-foreground">{match}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
            {odds.toFixed(2)}
          </div>
          {(predictionId || bundleId) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavoriteClick}
              className="h-8 w-8"
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
            </Button>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <span className="text-muted-foreground">Prediction: </span>
        <span className="font-semibold text-foreground">{prediction}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Confidence:</span>
          <span className="font-semibold text-foreground">{confidence}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div 
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
};