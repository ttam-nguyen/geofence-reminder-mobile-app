/**
 * Onboarding content.
 *
 * Three pages, in the order the product explains itself: what it does, how the arrival rule works,
 * and what it needs from the system. The copy follows the platform guidance: value first, permission
 * second, and the permission page has one action so it never imitates the system dialog.
 *
 * The illustrations are the store screenshots (demo data, no real addresses), so the marketing and
 * the in-app explanation cannot drift apart.
 */

export type OnboardingPageId = 'value' | 'how' | 'permissions';

export interface OnboardingPage {
  id: OnboardingPageId;
  title: string;
  body: string;
  image: number;
  /** Shown as small print under the body on the permission page. */
  footnote?: string;
}

export const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: 'value',
    title: 'PinPing reminds you when you reach a place',
    body: 'Pick a place. Write a short reminder. Close the app. PinPing tells you when you get there.',
    image: require('../assets/onboarding/page-1-home.png'),
  },
  {
    id: 'how',
    title: 'A circle of about 200 metres',
    body: 'Each reminder covers a small area around the place. PinPing waits about two minutes after you arrive, so it does not alert you when you drive past.',
    image: require('../assets/onboarding/page-2-map.png'),
  },
  {
    id: 'permissions',
    title: 'Two permissions make it work',
    body: 'Notifications send the alert. Location set to “all the time” lets PinPing notice arrivals while the app is closed. Nothing leaves your phone.',
    image: require('../assets/onboarding/page-3-create.png'),
    footnote: 'You can change both later in Settings.',
  },
];

/** AsyncStorage key. Versioned so a copy change can re-run the flow once. */
export const ONBOARDING_FLAG_KEY = 'geofence.onboarding.v3';

/** True when the flow should be shown: no flag stored, or a value we do not recognise. */
export function shouldShowOnboarding(stored: string | null | undefined): boolean {
  return stored !== 'done';
}
