// Tests for the onboarding flag and content contract.

import { ONBOARDING_FLAG_KEY, ONBOARDING_PAGES, shouldShowOnboarding } from '../steps';

describe('shouldShowOnboarding', () => {
  it('shows the flow when nothing is stored', () => {
    expect(shouldShowOnboarding(null)).toBe(true);
    expect(shouldShowOnboarding(undefined)).toBe(true);
  });

  it('hides the flow once it was completed or skipped', () => {
    expect(shouldShowOnboarding('done')).toBe(false);
  });

  it('treats an unrecognised value as not seen, so a corrupted flag cannot hide it forever', () => {
    expect(shouldShowOnboarding('true')).toBe(true);
    expect(shouldShowOnboarding('')).toBe(true);
  });

  it('uses a versioned key so copy changes can re-run the flow', () => {
    expect(ONBOARDING_FLAG_KEY).toMatch(/\.v\d+$/);
  });
});

describe('ONBOARDING_PAGES', () => {
  it('has three pages in the documented order', () => {
    expect(ONBOARDING_PAGES.map(page => page.id)).toEqual(['value', 'how', 'permissions']);
  });

  it('gives every page a title, a body and an illustration', () => {
    for (const page of ONBOARDING_PAGES) {
      expect(page.title.length).toBeGreaterThan(10);
      expect(page.body.length).toBeGreaterThan(20);
      expect(page.image).toBeDefined();
    }
  });

  it('explains the 200 m radius and the two-minute wait on the second page', () => {
    const how = ONBOARDING_PAGES[1];
    // The radius is the page title, the wait is in the body.
    expect(`${how.title} ${how.body}`).toContain('200');
    expect(how.body).toContain('two minutes');
  });

  it('names both permissions on the last page', () => {
    const permissions = ONBOARDING_PAGES[2];
    expect(permissions.body).toContain('Notifications');
    expect(permissions.body.toLowerCase()).toContain('location');
  });
});
