interface BookingCode {
  id: string;
  platform: string;
  booking_code: string;
}

interface BookingCodesDisplayProps {
  codes: BookingCode[];
  // Legacy single code support
  legacyCode?: string | null;
  legacyPlatform?: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  "football.com": "Football.com",
  "sportybet": "Sporty Bet",
  "betano": "Betano",
  "bet9ja": "Bet9ja",
  "betgr8": "Betgr8",
  "1xbet": "1xBet",
  "betway": "Betway",
  "other": "Other",
};

export const BookingCodesDisplay = ({ codes, legacyCode, legacyPlatform }: BookingCodesDisplayProps) => {
  const getPlatformLabel = (value: string) => {
    return PLATFORM_LABELS[value] || value;
  };

  // Combine multi-platform codes with legacy single code
  const allCodes: { platform: string; code: string }[] = [
    ...codes.map(c => ({ platform: c.platform, code: c.booking_code })),
  ];

  // Add legacy code if it exists and isn't already in the list
  if (legacyCode && !allCodes.some(c => c.platform === legacyPlatform && c.code === legacyCode)) {
    allCodes.unshift({ platform: legacyPlatform || 'football.com', code: legacyCode });
  }

  if (allCodes.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="text-xs text-muted-foreground mb-2">Platform Codes:</div>
      <div className="space-y-2">
        {allCodes.map((item, idx) => (
          <div key={idx} className="flex items-center flex-wrap gap-1 sm:gap-2">
            <span className="font-mono font-bold text-primary text-lg sm:text-2xl">
              {item.code}
            </span>
            <span className="text-muted-foreground text-xs sm:text-sm">on</span>
            <span className="font-semibold text-foreground text-sm">
              {getPlatformLabel(item.platform)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
