// Map screen — full-bleed map with a floating, drag-resizable reminder sheet.
// Rows dissolve as they reach the top or bottom edge of the list.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, PanResponder, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { store, storeReady } from "../stores/reminderStore";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { ReminderCard } from "../components/ReminderCard";
import { haversineDistance } from "../models/haversine";
import type { RootStackParamList } from "../navigation/AppNavigator";

const STATUS_LABELS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: "Draft",
  [ReminderStatus.WAITING_FOR_EXIT]: "Waiting for Exit",
  [ReminderStatus.ARMED]: "Armed",
  [ReminderStatus.ARRIVAL_PENDING]: "Arrival Pending",
  [ReminderStatus.TRIGGERED]: "Triggered",
  [ReminderStatus.COMPLETED]: "Completed",
  [ReminderStatus.PAUSED]: "Paused",
  [ReminderStatus.CANCELLED]: "Cancelled",
  [ReminderStatus.DELETED]: "Deleted",
};

const STATUS_COLORS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.signalRed,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.infoBlue,
  [ReminderStatus.TRIGGERED]: Colors.danger,
  [ReminderStatus.COMPLETED]: Colors.successGreen,
  [ReminderStatus.PAUSED]: Colors.textMuted,
  [ReminderStatus.CANCELLED]: Colors.textMuted,
  [ReminderStatus.DELETED]: Colors.textMuted,
};

const DEFAULT_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

/** Sheet height as a fraction of the map area. The sheet is anchored at the bottom. */
const SHEET_DEFAULT_RATIO = 0.4;
const SHEET_MIN_RATIO = 0.22;
const SHEET_MAX_RATIO = 0.82;
const SHEET_SIDE_INSET_RATIO = 0.15; // 70% width = 7/10 of the screen

/** Pixels over which a row fades out at the list edges. */
const ROW_FADE = 20;
const MIN_ROW_OPACITY = 0.28;
const MIN_ROW_SCALE = 0.95;

/**
 * Vertical gap between reminder cards in the sheet.
 * 0 = cards stack flush with each other. Try Spacing.xs (4) or Spacing.sm (8)
 * if they look too tight — this is the single knob for card spacing.
 */
const ROW_GAP = 0;

/** Zoom used when only a single reminder exists (fit-to-bounds cannot zoom). */
const SINGLE_MARKER_DELTA = 0.02;
const METERS_PER_DEGREE_LAT = 111320;
/** Radius circle should cover roughly a third of the visible map height. */
const RADIUS_VIEWPORT_SHARE = 0.35;

const HEADER_HEIGHT = 48;
const DRAG_HANDLE_HEIGHT = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface RowLayout {
  y: number;
  height: number;
}

export function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapAreaHeight, setMapAreaHeight] = useState(0);
  const [sheetHeightPx, setSheetHeightPx] = useState(0);
  const [rowLayouts, setRowLayouts] = useState<Record<string, RowLayout>>({});

  const mapRef = useRef<MapView>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  // Once the user picks a reminder we stop auto-fitting, otherwise a late
  // location fix or a reload would yank the camera away from their selection.
  const userSelectedRef = useRef(false);

  const sheetHeight = useRef(new Animated.Value(0)).current;
  const sheetHeightLiveRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const sheetMinHeight = mapAreaHeight * SHEET_MIN_RATIO;
  const sheetMaxHeight = mapAreaHeight * SHEET_MAX_RATIO;

  // Derived, not measured: the list fills the sheet below the grab handle and
  // its 1 px border. Deriving avoids a setState on every frame of a drag.
  const listViewportHeight = Math.max(0, sheetHeightPx - DRAG_HANDLE_HEIGHT - 2);

  // Keep a plain-number mirror of the animated sheet height. Needed for camera
  // padding and for the first frame of a drag gesture.
  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => {
      sheetHeightLiveRef.current = value;
    });
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // Re-entering the screen re-frames all reminders unless a tap follows.
      userSelectedRef.current = false;

      async function loadReminders() {
        await storeReady;
        const items = await store.findAll();
        if (!cancelled) {
          setReminders(items);
        }
      }
      loadReminders();

      Geolocation.getCurrentPosition(
        coords => {
          if (!cancelled) {
            setUserLocation({ latitude: coords.coords.latitude, longitude: coords.coords.longitude });
          }
        },
        () => {
          if (!cancelled) {
            setUserLocation(null);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const visibleReminders = useMemo(() => {
    const items = reminders.filter(r => r.status !== ReminderStatus.DELETED);
    if (!userLocation) {
      return items;
    }
    return [...items].sort(
      (a, b) =>
        haversineDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        haversineDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude),
    );
  }, [reminders, userLocation]);

  const initialRegion = useMemo(() => {
    const first = visibleReminders[0];
    if (first) {
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return DEFAULT_REGION;
  }, [visibleReminders]);

  const handleRootLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      setMapAreaHeight(height);
      if (height > 0 && sheetHeightLiveRef.current === 0) {
        const initial = height * SHEET_DEFAULT_RATIO;
        sheetHeightLiveRef.current = initial;
        sheetHeight.setValue(initial);
        setSheetHeightPx(initial);
      }
    },
    [sheetHeight],
  );

  // Drag the grab handle to resize the sheet (vertical only, no horizontal move).
  const dragState = useRef({ start: 0 }).current;
  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          dragState.start = sheetHeightLiveRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const next = clamp(dragState.start - gesture.dy, sheetMinHeight, sheetMaxHeight);
          sheetHeight.setValue(next);
        },
        onPanResponderRelease: () => {
          const settled = clamp(sheetHeightLiveRef.current, sheetMinHeight, sheetMaxHeight);
          sheetHeightLiveRef.current = settled;
          setSheetHeightPx(settled);
          // New sheet height changes the visible map area, so re-frame the pins.
          userSelectedRef.current = false;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [sheetHeight, sheetMinHeight, sheetMaxHeight, dragState],
  );

  const resizeBy = useCallback(
    (delta: number) => {
      const next = clamp(sheetHeightLiveRef.current + delta, sheetMinHeight, sheetMaxHeight);
      sheetHeightLiveRef.current = next;
      sheetHeight.setValue(next);
      setSheetHeightPx(next);
      userSelectedRef.current = false;
    },
    [sheetHeight, sheetMinHeight, sheetMaxHeight],
  );

  // Frame every reminder. This is one native camera command — it does not
  // remount the map or re-render the markers.
  useEffect(() => {
    if (!mapReady || userSelectedRef.current) {
      return;
    }

    const coordinates = visibleReminders.map(r => ({
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    if (coordinates.length === 0) {
      return;
    }

    if (coordinates.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: coordinates[0].latitude - toCenterOffset(SINGLE_MARKER_DELTA),
          longitude: coordinates[0].longitude,
          latitudeDelta: SINGLE_MARKER_DELTA,
          longitudeDelta: SINGLE_MARKER_DELTA,
        },
        500,
      );
      return;
    }

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: {
        top: insets.top + HEADER_HEIGHT + Spacing.md,
        right: Spacing.lg,
        bottom: sheetHeightPx + Spacing.md + Spacing.lg,
        left: Spacing.lg,
      },
      animated: true,
    });
  }, [visibleReminders, mapReady, sheetHeightPx, insets.top]);

  // Shift the camera south so the target lands in the strip of map that the
  // sheet does not cover. `react-native-maps` has no setMapPadding() method and
  // the `mapPadding` prop is Android/Google only, so this works everywhere.
  function toCenterOffset(latitudeDelta: number): number {
    if (mapAreaHeight <= 0) {
      return 0;
    }
    const coveredFraction = sheetHeightPx / mapAreaHeight;
    return (latitudeDelta * coveredFraction) / 2;
  }

  const handleCardPress = (id: string) => {
    const reminder = visibleReminders.find(r => r.id === id);
    if (!reminder) {
      return;
    }

    const now = Date.now();
    if (lastTapRef.current && lastTapRef.current.id === id && now - lastTapRef.current.time < 300) {
      lastTapRef.current = null;
      navigation.navigate("Detail", { reminder });
      return;
    }

    userSelectedRef.current = true;
    const visibleMeters = reminder.radiusMeters / RADIUS_VIEWPORT_SHARE;
    const latitudeDelta = clamp(visibleMeters / METERS_PER_DEGREE_LAT, 0.0025, 0.03);

    mapRef.current?.animateToRegion(
      {
        latitude: reminder.latitude - toCenterOffset(latitudeDelta),
        longitude: reminder.longitude,
        latitudeDelta,
        longitudeDelta: latitudeDelta,
      },
      600,
    );
    lastTapRef.current = { id, time: now };
  };

  const handleRowLayout = useCallback((id: string, event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setRowLayouts(previous => {
      const current = previous[id];
      if (current && current.y === y && current.height === height) {
        return previous;
      }
      return { ...previous, [id]: { y, height } };
    });
  }, []);

  // Rows dissolve as they approach either edge of the list viewport.
  const rowOpacity = (id: string): Animated.WithAnimatedValue<number> => {
    const layout = rowLayouts[id];
    if (!layout || listViewportHeight === 0) {
      return 1;
    }

    const fadeInAtTop = scrollY.interpolate({
      inputRange: [layout.y - ROW_FADE, layout.y],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    const bottomEdge = layout.y + layout.height - listViewportHeight;
    const fadeOutAtBottom = scrollY.interpolate({
      inputRange: [bottomEdge, bottomEdge + ROW_FADE],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    return Animated.multiply(fadeInAtTop, fadeOutAtBottom);
  };

  const activeCount = visibleReminders.length;

  return (
    <View style={styles.root} onLayout={handleRootLayout}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
      >
        {visibleReminders.map(r => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            title={r.title}
            description={STATUS_LABELS[r.status]}
            pinColor={STATUS_COLORS[r.status]}
          />
        ))}
      </MapView>

      <View style={[styles.header, { top: insets.top + Spacing.sm }]} accessibilityRole="header" pointerEvents="none">
        <Text style={Typography.h3}>Map</Text>
        <View style={styles.countPill}>
          <Text style={Typography.caption}>
            {activeCount} {activeCount === 1 ? "reminder" : "reminders"}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            bottom: Spacing.md,
            left: `${SHEET_SIDE_INSET_RATIO * 100}%`,
            right: `${SHEET_SIDE_INSET_RATIO * 100}%`,
          },
        ]}
      >
        <View
          {...resizeResponder.panHandlers}
          style={styles.dragHandleArea}
          hitSlop={{ top: Spacing.sm, bottom: Spacing.sm }}
          testID="map.sheet.dragHandle"
          accessibilityRole="adjustable"
          accessibilityLabel="Reminder list height"
          accessibilityHint="Drag up or down to show more or fewer reminders"
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={event => {
            const step = mapAreaHeight * 0.08;
            resizeBy(event.nativeEvent.actionName === "increment" ? step : -step);
          }}
        >
          {/* Grip: carets on both sides of the bar signal `drag me vertically`. */}
          <View style={styles.dragHandleRow}>
            <View style={styles.caretUp} />
            <View style={styles.dragHandleBar} />
            <View style={styles.caretDown} />
          </View>
        </View>

        {visibleReminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[Typography.bodySmall, styles.emptyText]}>No reminders to display.</Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {visibleReminders.map(item => (
              <Animated.View
                key={item.id}
                onLayout={event => handleRowLayout(item.id, event)}
                style={[styles.row, { opacity: rowOpacity(item.id) }]}
              >
                <ReminderCard reminder={item} onPress={handleCardPress} />
              </Animated.View>
            ))}
          </Animated.ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceGlassStrong,
  },
  sheet: {
    position: "absolute",
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 14,
      },
    }),
  },
  dragHandleArea: {
    height: DRAG_HANDLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.textMuted,
    opacity: 0.7,
  },
  caretUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: Colors.textMuted,
    opacity: 0.7,
  },
  caretDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.textMuted,
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: ROW_FADE,
    paddingBottom: ROW_FADE,
  },
  row: {
    marginBottom: ROW_GAP,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
});
