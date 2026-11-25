// Map screen — full-bleed map with a floating, drag-resizable reminder sheet.
// The card nearest the sheet's vertical centre is in focus; neighbours stay ghosted.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
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
import { log } from "../services/logger";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { ReminderCard } from "../components/ReminderCard";
import { PressableArea } from "../components/PressableArea";
import { Icon } from "../components/Icon";
import { haversineDistance } from "../models/haversine";
import {
  MAX_PLACE_NAME_LENGTH,
  listPlaces,
  removePlace,
  renamePlace,
  setPlaceSaved,
  type SavedPlace,
} from "../stores/placeStore";
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
/**
 * Where the focused card's centre sits, as a fraction of the list height. Centring the card in
 * the whole viewport used to be done with a large content padding, but padding that changes with
 * the measured viewport re-runs layout and Yoga squashed every row to ~42 dp, so the cards drew
 * over each other. A focus line near the top needs no extra space at all.
 */
const FOCUS_LINE_RATIO = 0.25;

/**
 * Vertical gap between cards in the sheet. This is the single knob for card spacing.
 * 0 made adjacent glass cards render flush and read as one overlapping block, so the default is
 * a real gap; Spacing.xs (4) or Spacing.lg (24) are the other sensible values.
 */
const ROW_GAP = Spacing.sm;

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
  /** The sheet shows either monitored reminders or saved places. */
  const [mode, setMode] = useState<"reminders" | "favourites">("reminders");
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
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

      listPlaces()
        .then(items => {
          if (!cancelled) {
            setPlaces(items);
          }
        })
        .catch(error => log.error("places", "Failed to load places", { error: String(error) }));

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

  /** Starred places only, nearest first when a fix exists. */
  const savedPlaces = useMemo(() => {
    const favourites = places.filter(place => place.saved);
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? favourites.filter(place => place.name.toLowerCase().includes(query))
      : favourites;

    if (!userLocation) {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }

    return [...matched].sort(
      (a, b) =>
        haversineDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        haversineDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude),
    );
  }, [places, searchQuery, userLocation]);

  const activeIds = useMemo(
    () => (mode === "reminders" ? searchedReminders.map(item => item.id) : savedPlaces.map(place => place.id)),
    [mode, searchedReminders, savedPlaces],
  );

  const distanceFor = useCallback(
    (latitude: number, longitude: number): string => {
      if (!userLocation) {
        return "";
      }
      const metres = haversineDistance(userLocation.latitude, userLocation.longitude, latitude, longitude);
      return metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`;
    },
    [userLocation],
  );

  /** Switching modes resets layouts, the query and the scroll position. */
  const switchMode = useCallback(
    (next: "reminders" | "favourites") => {
      if (next === mode) {
        return;
      }
      setMode(next);
      setSearchQuery("");
      setRowLayouts({});
      setEditingPlaceId(null);
      userSelectedRef.current = false;
      scrollY.setValue(0);
    },
    [mode, scrollY],
  );

  // Rename uses its own dialog: the sheet is anchored to the bottom, so an inline field sits
  // behind the keyboard. A centred card keeps the input visible on both platforms.
  const beginRename = useCallback((place: SavedPlace) => {
    setEditingPlaceId(place.id);
    setEditingName(place.name);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingPlaceId(null);
    setEditingName("");
  }, []);

  const commitRename = useCallback(async () => {
    const placeId = editingPlaceId;
    if (!placeId) {
      return;
    }
    const name = editingName.trim();
    if (name.length === 0) {
      // Keep the dialog open: an empty name is rejected rather than silently dropped.
      return;
    }
    setEditingPlaceId(null);
    try {
      setPlaces(await renamePlace(placeId, name));
      log.info("places", "Place renamed", { placeId });
    } catch (error) {
      log.warn("places", "Rename rejected", { placeId, error: String(error) });
    }
  }, [editingPlaceId, editingName]);

  const toggleSaved = useCallback(async (place: SavedPlace) => {
    try {
      setPlaces(await setPlaceSaved(place.id, !place.saved));
    } catch (error) {
      log.warn("places", "Failed to update favourite", { placeId: place.id, error: String(error) });
    }
  }, []);

  const forgetPlace = useCallback(async (place: SavedPlace) => {
    try {
      setPlaces(await removePlace(place.id));
      log.info("places", "Place removed", { placeId: place.id });
    } catch (error) {
      log.warn("places", "Failed to remove place", { placeId: place.id, error: String(error) });
    }
  }, []);

  const focusOn = useCallback(
    (latitude: number, longitude: number, delta = SINGLE_MARKER_DELTA) => {
      userSelectedRef.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: latitude - toCenterOffset(delta),
          longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        600,
      );
    },
    // toCenterOffset is stable for a given sheet/area combination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheetHeightPx, mapAreaHeight],
  );

  const initialRegion = useMemo(() => {
    const first = mode === "reminders" ? visibleReminders[0] : savedPlaces[0];
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
  }, [mode, visibleReminders, savedPlaces, userLocation]);

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

    const coordinates =
      mode === "reminders"
        ? visibleReminders.map(r => ({ latitude: r.latitude, longitude: r.longitude }))
        : savedPlaces.map(place => ({ latitude: place.latitude, longitude: place.longitude }));

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
  }, [visibleReminders, savedPlaces, mode, mapReady, sheetHeightPx, insets.top, userLocation]);

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
  /** Height of the scrollable content, derived from the rows that were actually measured. */
  const listContentHeight = useMemo(() => {
    const layouts = activeIds
      .map(id => rowLayouts[id])
      .filter((layout): layout is RowLayout => Boolean(layout));
    if (layouts.length === 0) {
      return 0;
    }
    return Math.max(...layouts.map(layout => layout.y + layout.height));
  }, [activeIds, rowLayouts]);

  const maxScroll = Math.max(0, listContentHeight - listViewportHeight);
  const focusLine = listViewportHeight * FOCUS_LINE_RATIO;

  // Rows fade in and out by their distance from the viewport centre, so scrolling moves a card
  // through focus instead of everything staying dim.
  const rowAnimatedStyle = (id: string): Animated.WithAnimatedValue<ViewStyle> => {
    const layout = rowLayouts[id];
    if (!layout || listViewportHeight === 0) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }

    // Scroll offset at which this row's centre reaches the focus line.
    const centerScrollY = clamp(layout.y + layout.height / 2 - focusLine, 0, maxScroll);
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

    const offsets = activeIds
      .map(id => rowLayouts[id])
      .filter((layout): layout is RowLayout => Boolean(layout))
      .map(layout => clamp(layout.y + layout.height / 2 - focusLine, 0, maxScroll));

    // react-native requires ascending snap offsets.
    return [...new Set(offsets)].sort((a, b) => a - b);
  }, [activeIds, rowLayouts, focusLine, maxScroll]);


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
        {(mode === "reminders" ? visibleReminders : savedPlaces).map(r => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            title={"title" in r ? r.title : r.name}
            description={"status" in r ? STATUS_LABELS[r.status] : "Saved place"}
            pinColor={"status" in r ? STATUS_COLORS[r.status] : Colors.waitingAmber}
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
          {/* One sheet, two lists: monitored reminders, or the saved places they can be made from. */}
          <View style={styles.modeToggle}>
            <PressableArea
              testID="map.mode.reminders"
              accessibilityLabel="Show reminders"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "reminders" }}
              onPress={() => switchMode("reminders")}
              style={[styles.modeButton, mode === "reminders" && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, mode === "reminders" && styles.modeButtonTextActive]}>
                Reminders
              </Text>
            </PressableArea>
            <PressableArea
              testID="map.mode.favourites"
              accessibilityLabel="Show saved places"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "favourites" }}
              onPress={() => switchMode("favourites")}
              style={[styles.modeButton, mode === "favourites" && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, mode === "favourites" && styles.modeButtonTextActive]}>
                Saved
              </Text>
            </PressableArea>
          </View>

          <View style={styles.searchField}>
            <Icon name="search" size={16} color={Colors.textMuted} />
            <TextInput
              testID="map.search.input"
              accessibilityLabel={
                mode === "reminders" ? "Search reminders on the map" : "Search saved places"
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={mode === "reminders" ? "Search reminders…" : "Search saved places…"}
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
            {mode === "reminders" ? `${activeCount} nearby` : `${activeCount} saved`}
          </Text>
        </View>

        {activeIds.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[Typography.bodySmall, styles.emptyText]}>
              {mode === "favourites"
                ? searchQuery
                  ? `No saved places match \u201c${searchQuery}\u201d.`
                  : "No saved places yet. Star a search result to save it here."
                : searchQuery
                  ? `No reminders match \u201c${searchQuery}\u201d.`
                  : "No reminders to display."}
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            snapToOffsets={snapOffsets}
            decelerationRate="fast"
            // No rubber-band past the ends, so a gesture cannot park in empty space.
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={activeIds.length > 1}
          >
            {mode === "reminders"
              ? searchedReminders.map(item => (
                  <Animated.View
                    key={item.id}
                    onLayout={event => handleRowLayout(item.id, event)}
                    style={[styles.row, rowAnimatedStyle(item.id)]}
                  >
                    <ReminderCard reminder={item} onPress={handleCardPress} />
                  </Animated.View>
                ))
              : savedPlaces.map(place => (
                  <Animated.View
                    key={place.id}
                    onLayout={event => handleRowLayout(place.id, event)}
                    style={[styles.row, rowAnimatedStyle(place.id)]}
                  >
                    <View style={styles.placeRow}>
                      <PressableArea
                        testID={`map.place.${place.id}`}
                        accessibilityLabel={`${place.name}, saved place`}
                        accessibilityHint="Tap to centre the map, long press to rename"
                        accessibilityRole="button"
                        onPress={() => focusOn(place.latitude, place.longitude)}
                        onLongPress={() => beginRename(place)}
                        style={styles.placeNameButton}
                      >
                        <Text style={styles.placeName} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text style={styles.placeMeta} numberOfLines={1}>
                          {distanceFor(place.latitude, place.longitude)}
                        </Text>
                      </PressableArea>

                      <PressableArea
                        testID={`map.place.${place.id}.rename`}
                        accessibilityLabel={`Rename ${place.name}`}
                        accessibilityRole="button"
                        onPress={() => beginRename(place)}
                        style={styles.placeAction}
                      >
                        <Icon name="pencil" size={18} color={Colors.textMuted} />
                      </PressableArea>

                      <PressableArea
                        testID={`map.place.${place.id}.remove`}
                        accessibilityLabel={`Remove ${place.name}`}
                        accessibilityRole="button"
                        onPress={() => {
                          void forgetPlace(place);
                        }}
                        style={styles.placeAction}
                      >
                        <Icon name="trash" size={18} color={Colors.textMuted} />
                      </PressableArea>
                    </View>
                  </Animated.View>
                ))}
          </Animated.ScrollView>
        )}
      </Animated.View>

      <Modal
        visible={editingPlaceId !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelRename}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.renameBackdrop}
        >
          <View style={styles.renameCard}>
            <Text style={[Typography.h3, styles.renameTitle]}>Rename place</Text>
            <TextInput
              testID="map.rename.input"
              accessibilityLabel="Place name"
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
              maxLength={MAX_PLACE_NAME_LENGTH}
              returnKeyType="done"
              onSubmitEditing={() => {
                void commitRename();
              }}
              placeholder="e.g. Home, Gym, Mum's place"
              placeholderTextColor={Colors.textMuted}
              style={styles.renameInput}
            />
            <View style={styles.renameActions}>
              <PressableArea
                testID="map.rename.cancel"
                accessibilityLabel="Cancel rename"
                accessibilityRole="button"
                onPress={cancelRename}
                style={[styles.renameButton, styles.renameCancel]}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </PressableArea>
              <PressableArea
                testID="map.rename.save"
                accessibilityLabel="Save place name"
                accessibilityRole="button"
                disabled={editingName.trim().length === 0}
                onPress={() => {
                  void commitRename();
                }}
                style={[styles.renameButton, styles.renameSave]}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </PressableArea>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modeToggle: {
    flexDirection: "row",
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  modeButton: {
    flex: 1,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.pill,
  },
  modeButtonActive: {
    backgroundColor: Colors.signalRed,
  },
  modeButtonText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  placeNameButton: {
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  placeName: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  placeMeta: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  renameCard: {
    width: "100%",
    maxWidth: 360,
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  renameTitle: {
    marginBottom: Spacing.xs,
  },
  renameInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 48,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  renameActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  renameButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  renameCancel: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  renameCancelText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  renameSave: {
    backgroundColor: Colors.signalRed,
  },
  renameSaveText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeAction: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: Spacing.sm,
  },
  row: {
    // Rows must never be compressed: a squashed row keeps its children and they draw over the
    // next card. The cause of that was the viewport-derived content padding, which is gone; this
    // stays as a guard.
    flexShrink: 0,
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
