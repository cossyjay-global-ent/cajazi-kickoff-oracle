import { Link } from 'react-router-dom';
import { Download, Share, Plus, ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const Install = () => {
  const { isInstallable, isInstalled, promptInstall, showIOSInstructions, isIOS } = usePWAInstall();

  const handleInstall = async () => {
    await promptInstall();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">
            Install Cajazi App
          </h1>

          {isInstalled ? (
            <div className="space-y-4">
              <div className="bg-success/10 text-success rounded-lg p-4">
                <p className="font-medium">App is already installed!</p>
                <p className="text-sm mt-1 opacity-80">
                  You can access Cajazi from your home screen
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/">Continue to App</Link>
              </Button>
            </div>
          ) : showIOSInstructions ? (
            <div className="space-y-6 text-left">
              <p className="text-muted-foreground text-center">
                Follow these steps to install on your iOS device:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      Tap the <Share className="h-4 w-4" /> Share button
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Located at the bottom of Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      Scroll and tap <Plus className="h-4 w-4" /> Add to Home Screen
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      You may need to scroll down in the share menu
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Tap "Add"</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The app will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Install our app for faster access to predictions, offline support, and a native app experience.
              </p>
              
              <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  <span className="text-sm text-foreground">Works offline</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  <span className="text-sm text-foreground">Faster loading</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  <span className="text-sm text-foreground">Home screen access</span>
                </div>
              </div>

              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Install App
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Visit this page on a mobile device or supported browser to install the app.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Supported browsers:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Chrome (Android, Desktop)</li>
                  <li>Edge (Desktop)</li>
                  <li>Safari (iOS)</li>
                </ul>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link to="/">Continue to Website</Link>
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          No app store download required. Install directly from your browser.
        </p>
      </div>
    </div>
  );
};

export default Install;
