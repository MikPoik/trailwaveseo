// Google Analytics 4 integration with cookie consent

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_ID = import.meta.env.VITE_GA_ID;
const CONSENT_KEY = 'cookie-consent';

// Check if user has consented to cookies
export function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}

// Initialize Google Analytics
export function initGA() {
  if (!GA_ID) {
    console.warn('Google Analytics ID not found in environment variables');
    return;
  }

  if (!hasConsent()) {
    console.log('Google Analytics not initialized - no consent');
    return;
  }

  // Check if already initialized
  if (window.gtag) {
    console.log('Google Analytics already initialized');
    return;
  }

  // Load GA script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: true,
    anonymize_ip: true, // Anonymize IP for privacy
  });

  console.log('Google Analytics initialized with ID:', GA_ID);
}

// Clean up GA when consent is withdrawn
export function cleanupGA() {
  if (!window.gtag) return;

  // Disable GA
  if (GA_ID) {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
    });
  }

  // Remove GA cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('_ga') || name.startsWith('_gid')) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  }

  console.log('Google Analytics cleaned up');
}

// Track page views
export function trackPageView(url: string, title?: string) {
  if (!hasConsent() || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: url,
    page_title: title || document.title,
  });
}

// Track custom events
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (!hasConsent() || !window.gtag) return;

  window.gtag('event', eventName, eventParams);
}

// Track analysis started
export function trackAnalysis(domain: string) {
  trackEvent('analysis_started', {
    domain,
  });
}

// Track analysis completed
export function trackAnalysisComplete(domain: string, pageCount: number) {
  trackEvent('analysis_completed', {
    domain,
    page_count: pageCount,
  });
}

// Track export
export function trackExport(format: 'csv' | 'pdf' | 'json') {
  trackEvent('export', {
    format,
  });
}
