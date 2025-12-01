interface PredictionCardProps {
  match: string;
  prediction: string;
  odds: number;
  confidence: number;
}

export const PredictionCard = ({ match, prediction, odds, confidence }: PredictionCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="text-lg font-semibold text-foreground">{match}</div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
          {odds.toFixed(2)}
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