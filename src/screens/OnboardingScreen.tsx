/**
 * OnboardingScreen — first-run explanation, three pages, skippable.
 *
 * Order and behaviour come from the platform guidance: show the value, explain the rule, then ask for
 * the permissions with one action ("Continue") so the screen never imitates the system dialog or
 * offers a fake "Allow" button. The system prompts are triggered only at the end, by the existing
 * permission services.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { PressableArea } from '../components/PressableArea';
import { Icon } from '../components/Icon';
import { ONBOARDING_PAGES, type OnboardingPage } from '../onboarding/steps';
import { log } from '../services/logger';
import { requestBackgroundLocationPermission } from '../services/geofencingService';
import { notificationService } from '../services/notificationService';
import { PermissionsAndroid, Platform } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

interface OnboardingScreenProps {
  /** Called when the flow is finished or skipped. */
  onDone: () => void;
}

const IMAGE_ASPECT = 2160 / 1080;

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const [index, setIndex] = useState(0);
  const [requesting, setRequesting] = useState(false);

  const pageWidth = width;
  // Keep the 1:2 aspect of the store screenshots while fitting the space above the copy, so
  // `cover` never crops the app header out of the picture.
  const maxImageWidth = Math.min(width * 0.64, 320);
  const maxImageHeight = height * 0.5;
  const imageHeight = Math.min(maxImageWidth * IMAGE_ASPECT, maxImageHeight);
  const imageWidth = imageHeight / IMAGE_ASPECT;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(pageWidth, 1));
      setIndex(current => (next === current ? current : next));
    },
    [pageWidth],
  );

  /**
   * Leaves the flow. The flag write alone is not enough: the navigator keeps the route it mounted
   * with, so a later `initialRouteName` change has no effect and the screen would stay put.
   */
  const closeFlow = useCallback(
    (reason: 'completed' | 'skipped') => {
      if (navigation.canGoBack()) {
        // Replayed from Settings: return to the tab the user came from.
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
      onDone();
      if (reason === 'skipped') {
        log.info('onboarding', 'Onboarding skipped');
      }
    },
    [navigation, onDone],
  );

  const goNext = useCallback(() => {
    const next = index + 1;
    if (next < ONBOARDING_PAGES.length) {
      listRef.current?.scrollToOffset({ offset: next * pageWidth, animated: true });
      setIndex(next);
      return;
    }
    void finish();
  }, [index, pageWidth]);

  async function finish() {
    if (requesting) {
      return;
    }

    // The permission page has promised the two prompts; trigger them in the same order.
    setRequesting(true);
    try {
      const status = await notificationService.checkPermission();
      if (status === 'unspecified') {
        await notificationService.requestPermission();
      }

      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        // Android 11+ can only grant "all the time" from the settings screen; the call opens it.
        await requestBackgroundLocationPermission();
      }
    } catch (error) {
      log.warn('onboarding', 'Permission step failed', { error: String(error) });
    } finally {
      setRequesting(false);
      log.info('onboarding', 'Onboarding completed');
      closeFlow('completed');
    }
  }

  const isLast = index === ONBOARDING_PAGES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[Typography.h3, styles.brand]}>PinPing</Text>
        <PressableArea
          testID="onboarding.skip"
          accessibilityLabel="Skip the introduction"
          accessibilityRole="button"
          onPress={() => closeFlow('skipped')}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </PressableArea>
      </View>

      <FlatList
        ref={listRef}
        data={ONBOARDING_PAGES}
        keyExtractor={page => page.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_data, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        renderItem={({ item }: ListRenderItemInfo<OnboardingPage>) => (
          <View style={[styles.page, { width: pageWidth }]}>
            <Image
              source={item.image}
              accessibilityLabel={`Screenshot of the ${item.id} screen`}
              style={[styles.image, { width: imageWidth, height: imageHeight }]}
              resizeMode="cover"
            />
            <Text style={[Typography.h2, styles.title]}>{item.title}</Text>
            <Text style={[Typography.bodySmall, styles.body]}>{item.body}</Text>
            {item.footnote ? (
              <Text style={[Typography.caption, styles.footnote]}>{item.footnote}</Text>
            ) : null}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessibilityLabel={`Page ${index + 1} of ${ONBOARDING_PAGES.length}`}
        >
          {ONBOARDING_PAGES.map((page, i) => (
            <View key={page.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <PressableArea
          testID="onboarding.continue"
          accessibilityLabel={isLast ? 'Continue to permissions' : 'Next page'}
          accessibilityRole="button"
          disabled={requesting}
          onPress={goNext}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {requesting ? 'Opening settings…' : isLast ? 'Continue' : 'Next'}
          </Text>
          {!requesting ? <Icon name="chevron-right" size={16} color="#FFFFFF" /> : null}
        </PressableArea>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  brand: {
    color: Colors.textPrimary,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  image: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    backgroundColor: Colors.surface,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 420,
  },
  footnote: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.disabledFill,
  },
  dotActive: {
    backgroundColor: Colors.signalRed,
    width: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.signalRed,
  },
  primaryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
