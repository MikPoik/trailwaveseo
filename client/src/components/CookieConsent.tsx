import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

const CONSENT_KEY = 'cookie-consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
    // Trigger GA initialization
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { consent: 'accepted' } }));
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShowBanner(false);
    // Trigger GA cleanup
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { consent: 'declined' } }));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto p-6 shadow-lg border-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Cookie Preferences</h3>
            <p className="text-sm text-muted-foreground">
              We use cookies to analyze our website traffic and improve your experience. 
              By accepting, you consent to our use of Google Analytics cookies for analytics purposes.
              You can change your preferences at any time in settings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-fit">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="whitespace-nowrap"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="whitespace-nowrap"
            >
              Accept Cookies
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
