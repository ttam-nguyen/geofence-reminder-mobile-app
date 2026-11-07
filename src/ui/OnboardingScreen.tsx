/**
 * OnboardingScreen — 3-screen onboarding flow.
 *
 * Screens:
 * 1. Concept explanation (what GPS Reminder does)
 * 2. Background location explanation
 * 3. Notification permissions explanation + request button
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';

export interface OnboardingScreenProps {
  /** Called after completing all 3 onboarding screens */
  onComplete: () => void;
}

type ScreenIndex = 0 | 1 | 2;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [currentScreen, setCurrentScreen] = useState<ScreenIndex>(0);

  const totalScreens: ScreenIndex = 2;
  const isLastScreen = currentScreen === totalScreens;

  const handleNext = () => {
    if (isLastScreen) {
      onComplete();
    } else {
      setCurrentScreen((prev) => (prev + 1) as ScreenIndex);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Screen content for each step
  const screens = [
    {
      title: 'GPS Reminder',
      subtitle: 'Remember what you need when you arrive — not at an arbitrary time.',
      body: 'Create location-based reminders that trigger when you enter a specific area. No time-based alerts — just pure place-triggered notifications.',
    },
    {
      title: 'Background Location',
      subtitle: 'Why we need your location, even when the app is closed.',
      body: 'To monitor whether you have entered a reminder area, we need to track your location in the background. This works even when you are not using the app. You can revoke this permission at any time in Settings.',
    },
    {
      title: 'Notifications',
      subtitle: 'How you will be alerted when a reminder triggers.',
      body: 'When you enter a reminder area, we will send you a local notification with sound and vibration (if enabled). Notifications work offline and do not require an internet connection.',
    },
  ];

  const screen = screens[currentScreen];

  return (
    <SafeAreaWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Screen indicator dots */}
          <View style={styles.dotsContainer}>
            {screens.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: idx === currentScreen ? colors.primary : colors.divider,
                    width: idx === currentScreen ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Screen content */}
          <Text style={[styles.title, { color: colors.primaryText }]}>{screen.title}</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{screen.subtitle}</Text>
          <Text style={[styles.body, { color: colors.secondary }]}>{screen.body}</Text>

          {/* Placeholder visual */}
          <View style={[styles.visualPlaceholder, { backgroundColor: colors.glassBackground }]}>
            <Text style={[styles.visualLabel, { color: colors.secondary }]}>App Preview</Text>
          </View>
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.footer}>
          {currentScreen > 0 && (
            <Button variant="ghost" onPress={() => setCurrentScreen((prev) => (prev - 1) as ScreenIndex)} style={styles.backButton}>
              Back
            </Button>
          )}
          <View style={styles.buttonRow}>
            <Button variant="ghost" onPress={handleSkip} style={styles.skipButton}>
              Skip
            </Button>
            <Button variant="primary" onPress={handleNext} style={styles.nextButton}>
              {isLastScreen ? 'Get Started' : 'Next'}
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  visualPlaceholder: {
    height: 180,
    borderRadius: 20,
    marginTop: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualLabel: {
    fontSize: 13,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
  },
  buttonRow: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  skipButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
