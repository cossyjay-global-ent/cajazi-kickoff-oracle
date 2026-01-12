import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export interface PlatformBookingCode {
  id: string;
  platform: string;
  bookingCode: string;
}

interface MultiPlatformBookingCodesProps {
  codes: PlatformBookingCode[];
  onChange: (codes: PlatformBookingCode[]) => void;
}

const PLATFORMS = [
  { value: "football.com", label: "Football.com" },
  { value: "sportybet", label: "Sporty Bet" },
  { value: "betano", label: "Betano" },
  { value: "bet9ja", label: "Bet9ja" },
  { value: "betgr8", label: "Betgr8" },
  { value: "1xbet", label: "1xBet" },
  { value: "betway", label: "Betway" },
  { value: "other", label: "Other" },
];

export const MultiPlatformBookingCodes = ({ codes, onChange }: MultiPlatformBookingCodesProps) => {
  const [platform, setPlatform] = useState("football.com");
  const [bookingCode, setBookingCode] = useState("");

  const addCode = () => {
    if (!bookingCode.trim()) {
      toast.error("Please enter a booking code");
      return;
    }

    // Check for duplicate platform
    if (codes.some(c => c.platform === platform)) {
      toast.error(`A booking code for ${platform} already exists`);
      return;
    }

    const newCode: PlatformBookingCode = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      bookingCode: bookingCode.trim(),
    };

    onChange([...codes, newCode]);
    setBookingCode("");
    toast.success("Platform code added");
  };

  const removeCode = (id: string) => {
    onChange(codes.filter(c => c.id !== id));
  };

  const getPlatformLabel = (value: string) => {
    return PLATFORMS.find(p => p.value === value)?.label || value;
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs sm:text-sm font-semibold">Platform Booking Codes</Label>
      
      {/* Input Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-full sm:w-[140px] bg-background text-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          value={bookingCode}
          onChange={(e) => setBookingCode(e.target.value)}
          placeholder="Enter booking code"
          maxLength={100}
          className="flex-1 text-sm h-9"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCode}
          className="h-9 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* List of Added Codes */}
      {codes.length > 0 && (
        <div className="space-y-2 mt-2">
          {codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                <span className="font-medium text-foreground truncate">
                  {getPlatformLabel(code.platform)}:
                </span>
                <span className="font-mono text-primary truncate">{code.bookingCode}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCode(code.id)}
                className="h-7 w-7 p-0 flex-shrink-0 ml-2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
