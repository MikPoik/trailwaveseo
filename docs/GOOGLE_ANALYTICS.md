# Google Analytics Integration

This document describes the Google Analytics implementation with cookie consent management in TrailWave SEO.

## Overview

The application integrates Google Analytics 4 (GA4) with a user-friendly cookie consent banner that respects user privacy choices. Analytics are only loaded and active when users explicitly accept cookies.

## Setup

### Environment Variables

Add your Google Analytics Measurement ID to your environment:

```bash
VITE_GA_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual GA4 Measurement ID.

## Features

### Cookie Consent Banner

- **Location**: Displays at the bottom of the page on first visit
- **Persistence**: User choice is stored in localStorage
- **Options**: 
  - Accept: Loads Google Analytics and enables tracking
  - Decline: No analytics loaded, no tracking cookies set

### Cookie Preferences in Settings

Users can manage their cookie preferences at any time:

1. Navigate to Settings page
2. Scroll to "Cookie Preferences" section
3. Enable or disable analytics cookies
4. Changes take effect immediately

### Privacy Features

- **IP Anonymization**: All IP addresses are anonymized
- **Cookie Cleanup**: When consent is declined, all GA cookies are removed
- **Consent-based Loading**: GA script only loads after user accepts
- **GDPR Compliant**: Users must opt-in before any tracking occurs

## Tracked Events

### Automatic Events

- **Page Views**: Tracked on every route change
- **Scroll Depth**: Automatically tracked by GA4
- **Engagement**: Time on page, session duration

### Custom Events

The following custom events are tracked:

#### Analysis Events
```typescript
// When user starts an analysis
trackAnalysis(domain: string)

// When analysis completes
trackAnalysisComplete(domain: string, pageCount: number)
```

#### Export Events
```typescript
// When user exports data
trackExport(format: 'csv' | 'pdf' | 'json')
```

### Adding Custom Events

To track additional events, use the `trackEvent` function:

```typescript
import { trackEvent } from '@/lib/analytics';

trackEvent('event_name', {
  category: 'category',
  label: 'label',
  value: 123
});
```

## Implementation Details

### Core Files

1. **`/client/src/lib/analytics.ts`**
   - GA initialization and cleanup
   - Event tracking functions
   - Consent checking

2. **`/client/src/components/CookieConsent.tsx`**
   - Cookie consent banner component
   - Handles user consent choices

3. **`/client/src/App.tsx`**
   - Integrates cookie consent banner
   - Initializes GA on app load (if consent exists)
   - Tracks page views on route changes

4. **`/client/src/pages/Settings.tsx`**
   - Cookie preferences management UI
   - Allows users to change consent after initial choice

### How It Works

1. **First Visit**:
   - User sees cookie consent banner
   - No tracking occurs until user accepts

2. **User Accepts**:
   - Consent stored in localStorage
   - GA script loaded dynamically
   - Tracking begins
   - Banner dismissed

3. **User Declines**:
   - Consent stored as "declined"
   - No GA script loaded
   - All GA cookies removed
   - Banner dismissed

4. **Subsequent Visits**:
   - App checks localStorage for consent
   - If accepted: GA initializes automatically
   - If declined: No tracking occurs
   - No banner shown (already decided)

5. **Changing Preferences**:
   - User goes to Settings
   - Can enable/disable at any time
   - Changes take effect immediately

### Consent Storage

Consent is stored in localStorage with the key `cookie-consent`:
- `"accepted"`: User has consented to analytics
- `"declined"`: User has declined analytics
- `null`: User has not made a choice yet

## Testing

### Verify GA is Working

1. Accept cookies in the banner
2. Open browser DevTools → Network tab
3. Look for requests to `google-analytics.com` or `googletagmanager.com`
4. Check browser console for "Google Analytics initialized" message

### Verify GA is NOT Working (when declined)

1. Decline cookies in the banner
2. Open browser DevTools → Network tab
3. No requests to Google Analytics should appear
4. Check Application → Cookies - no `_ga*` cookies should exist

### Test Cookie Cleanup

1. Accept cookies (GA cookies will be set)
2. Go to Settings → Cookie Preferences
3. Click "Disable"
4. Check Application → Cookies - all `_ga*` cookies should be removed

## Privacy Compliance

This implementation follows privacy best practices:

- ✅ **Opt-in Required**: No tracking until user consents
- ✅ **Easy Opt-out**: Users can disable at any time
- ✅ **Cookie Cleanup**: Cookies removed when declined
- ✅ **IP Anonymization**: All IPs anonymized
- ✅ **Transparent**: Clear explanation of what cookies do
- ✅ **Persistent Choice**: User choice remembered across sessions

## Customization

### Customize Tracked Events

Edit `/client/src/lib/analytics.ts` to add new tracking functions:

```typescript
export function trackCustomEvent(param1: string, param2: number) {
  trackEvent('custom_event_name', {
    param1,
    param2,
    timestamp: Date.now()
  });
}
```

### Customize Cookie Banner

Edit `/client/src/components/CookieConsent.tsx` to change:
- Banner text and styling
- Position (currently bottom)
- Animation
- Button labels

### Customize Settings UI

Edit `/client/src/pages/Settings.tsx` to modify:
- Cookie preferences section styling
- Additional privacy options
- Link to privacy policy
