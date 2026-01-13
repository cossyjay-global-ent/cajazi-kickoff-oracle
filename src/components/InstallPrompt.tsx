import { useState, useEffect, useCallback, memo } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const InstallPrompt = memo(() => {
  const { isInstallable, isInstalled, promptInstall, showIOSInstructions } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    const timer = setTimeout(() => {
      if ((isInstallable || showIOSInstructions) && !isInstalled) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, showIOSInstructions]);

  const handleInstall = useCallback(async () => {
    const success = await promptInstall();
    if (success) setIsVisible(false);
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  if (!isVisible || isDismissed || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 md:left-auto md:right-4 md:max-w-sm will-change-transform">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Download className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">Install Cajazi App</h3>
            
            {showIOSInstructions ? (
              <div className="mt-2 text-xs text-muted-foreground">
                <p className="mb-2">To install on iOS:</p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span>1. Tap</span>
                    <Share className="h-3 w-3" />
                    <span>Share</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <span>2. Tap</span>
                    <Plus className="h-3 w-3" />
                    <span>Add to Home Screen</span>
                  </span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Get quick access to predictions from your home screen
                </p>
                <Button onClick={handleInstall} size="sm" className="mt-3 w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

InstallPrompt.displayName = "InstallPrompt";
