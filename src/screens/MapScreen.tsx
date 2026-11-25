// Map screen — full-bleed map with a floating, drag-resizable reminder sheet.
// The card nearest the sheet's vertical centre is in focus; neighbours stay ghosted.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { store, storeReady } from "../stores/reminderStore";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { ReminderCard } from "../components/ReminderCard";
import { PressableArea } from "../components/PressableArea";
import { Icon } from "../components/Icon";
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

/**
 * Focus styling for the list.
 *
 * Rows are not faded to zero at the viewport edge: a fully transparent neighbour removes the cue
 * that the list scrolls, and with a short sheet it can leave a blank viewport.
 */
const MIN_ROW_OPACITY = 0.28;
const MIN_ROW_SCALE = 0.95;
/** Rough card height used to size the top/bottom padding that lets edges centre. */
const ROW_CENTER_REFERENCE_HEIGHT = 88;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLayouts, setRowLayouts] = useState<Record<string, RowLayout>>({});
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapAreaHeight, setMapAreaHeight] = useState(0);
  const [sheetHeightPx, setSheetHeightPx] = useState(0);

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
    // Triggered reminders are finished work: no marker, no row. They stay on the Home list.
    const items = reminders.filter(
      reminder =>
        reminder.status !== ReminderStatus.DELETED && reminder.status !== ReminderStatus.TRIGGERED,
    );
    if (!userLocation) {
      return items;
    }
    return [...items].sort(
      (a, b) =>
        haversineDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        haversineDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude),
    );
  }, [reminders, userLocation]);

  const searchedReminders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return visibleReminders;
    }
    return visibleReminders.filter(reminder =>
      `${reminder.title} ${reminder.locationName ?? ""} ${reminder.description ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [visibleReminders, searchQuery]);

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

    // Nothing to frame: open on the user, like the create screen's preview.
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }

    return DEFAULT_REGION;
  }, [visibleReminders, userLocation]);

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
      // No reminders to frame: centre the empty map on the user.
      if (userLocation) {
        mapRef.current?.animateToRegion(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500,
        );
      }
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
        top: insets.top + Spacing.md,
        right: Spacing.lg,
        bottom: sheetHeightPx + Spacing.md + Spacing.lg,
        left: Spacing.lg,
      },
      animated: true,
    });
  }, [visibleReminders, mapReady, sheetHeightPx, insets.top, userLocation]);

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
    const reminder = searchedReminders.find(r => r.id === id);
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

  // Rows are styled by distance from the snap position at the top of the sheet, never by distance
  // to an edge, so no scroll position can render every visible row at zero opacity.
  // Rows fade in and out by their distance from the viewport centre, so scrolling moves a card
  // through focus instead of everything staying dim.
  const rowAnimatedStyle = (id: string): Animated.WithAnimatedValue<ViewStyle> => {
    const layout = rowLayouts[id];
    if (!layout || listViewportHeight === 0) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }

    // Scroll offset at which this row's centre lines up with the viewport centre.
    const centerScrollY = layout.y + layout.height / 2 - listViewportHeight / 2;
    // Distance over which a row goes from full focus to the ghosted peek state.
    const focusBand = Math.max(layout.height * 0.85, listViewportHeight * 0.45);

    const opacity = scrollY.interpolate({
      inputRange: [centerScrollY - focusBand, centerScrollY, centerScrollY + focusBand],
      outputRange: [MIN_ROW_OPACITY, 1, MIN_ROW_OPACITY],
      extrapolate: "clamp",
    });

    const scale = scrollY.interpolate({
      inputRange: [centerScrollY - focusBand, centerScrollY, centerScrollY + focusBand],
      outputRange: [MIN_ROW_SCALE, 1, MIN_ROW_SCALE],
      extrapolate: "clamp",
    });

    return { opacity, transform: [{ scale }] };
  };

  // Snap points derived from measured layouts so a gesture settles with one card centred at full
  // opacity and its neighbours peeking in.
  const snapOffsets = useMemo(() => {
    if (listViewportHeight === 0) {
      return undefined;
    }

    const offsets = searchedReminders
      .map(item => rowLayouts[item.id])
      .filter((layout): layout is RowLayout => Boolean(layout))
      .map(layout => Math.max(0, layout.y + layout.height / 2 - listViewportHeight / 2));

    // react-native requires ascending snap offsets.
    return offsets.sort((a, b) => a - b);
  }, [searchedReminders, rowLayouts, listViewportHeight]);

  // Centring padding only matters when there is something to scroll between. With one result it
  // just opened a void under the header.
  const listPaddingVertical = useMemo(
    () =>
      searchedReminders.length > 1
        ? Math.max(Spacing.sm, (listViewportHeight - ROW_CENTER_REFERENCE_HEIGHT) / 2)
        : Spacing.sm,
    [listViewportHeight, searchedReminders.length],
  );

  const activeCount = searchedReminders.length;

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

        <View style={styles.sheetHeader}>
          <View style={styles.searchField}>
            <Icon name="search" size={16} color={Colors.textMuted} />
            <TextInput
              testID="map.search.input"
              accessibilityLabel="Search reminders on the map"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search reminders…"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <PressableArea
                testID="map.search.clear"
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Icon name="close" size={14} color={Colors.textMuted} />
              </PressableArea>
            ) : null}
          </View>
          <Text style={[Typography.caption, styles.sheetCount]}>
            {activeCount} nearby
          </Text>
        </View>

        {searchedReminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[Typography.bodySmall, styles.emptyText]}>
              {searchQuery ? `No reminders match “${searchQuery}”.` : "No reminders to display."}
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingVertical: listPaddingVertical }]}
            snapToOffsets={snapOffsets}
            decelerationRate="fast"
            // No rubber-band past the ends, so a gesture cannot park in empty space.
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={searchedReminders.length > 1}
          >
            {searchedReminders.map(item => (
              <Animated.View
                key={item.id}
                onLayout={event => handleRowLayout(item.id, event)}
                style={[styles.row, rowAnimatedStyle(item.id)]}
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
  sheetHeader: {
    // Stacked, not side by side: the sheet is 70% of the screen, and a field plus a count on one
    // row clipped the field and pushed the count past the sheet edge.
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.pill,
  },
  sheetCount: {
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
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
    // Ghosted, scaled-down rows must clip at the sheet bounds instead of bleeding past the
    // rounded corners. Kept on the list (not the sheet) so the sheet keeps its shadow.
    overflow: "hidden",
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
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
