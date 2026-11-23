/**
 * Unit tests for the geofencing service layer.
 *
 * Tests that the TypeScript service exports the expected API surface.
 * Actual integration requires a real device/simulator build.
 */

// Mock NativeModules before importing the service.
jest.mock('react-native', () => ({
  NativeModules: {
    GeofencingModule: {
      drainPendingGeofenceEvents: jest.fn(async () => []),
      registerGeofence: jest.fn(async () => null),
      unregisterGeofence: jest.fn(async () => null),
      listRegisteredGeofences: jest.fn(async () => []),
      getAuthorizationStatus: jest.fn(async () => 'granted'),
      requestLocationPermission: jest.fn(async () => null),
    },
  },
  NativeEventEmitter: class {
    addListener() { return { remove: jest.fn(), removeListeners: jest.fn() }; }
    removeAllListeners() {}
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios', Version: 17 },
  Linking: { openSettings: jest.fn(async () => undefined) },
  PermissionsAndroid: {
    PERMISSIONS: { ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    check: jest.fn(async () => true),
    request: jest.fn(async () => 'granted'),
  },
}));

// Mock the reminderStore (geofencingService imports store from here,
// and reminderStore imports from geofencingService — circular dependency).
jest.mock('../stores/reminderStore', () => ({
  store: {
    updateStatus: jest.fn(),
    getReminder: jest.fn((id: string) => ({
      id, title: 'Test Reminder', latitude: 37.7749, longitude: -122.4194,
      status: 'ARMED' as const, geofenceRadiusMeters: 200,
    })),
  },
}));

// Mock the eventProcessor.
jest.mock('../../models/eventProcessor', () => ({
  processGeofenceEvent: jest.fn(() => ({
    transitionType: 1, // ENTER
    nextStatus: 'ARRIVAL_PENDING' as const,
  })),
}));

// Mock stationaryService.
jest.mock('../stationaryService', () => ({
  StationaryService: jest.fn(),
  getActiveCandidates: jest.fn(() => []),
}));

// Mock notificationService.
jest.mock('../notificationService', () => ({
  notificationService: {
    displayNotification: jest.fn(),
    checkPermission: jest.fn(() => 'authorized'),
  },
}));

// Loaded at module scope: the op-sqlite mock registers hooks at import time, and Jest refuses
// hooks registered after the first test has started.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod: any = require('../geofencingService');

describe('GeofencingService (TypeScript layer exports)', () => {

  it('exports initGeofencingService', () => {
    expect(typeof mod.initGeofencingService).toBe('function');
  });

  it('exports registerReminderGeofence', () => {
    expect(typeof mod.registerReminderGeofence).toBe('function');
  });

  it('exports unregisterReminderGeofence', () => {
    expect(typeof mod.unregisterReminderGeofence).toBe('function');
  });

  it('exports setOnStatusChange', () => {
    expect(typeof mod.setOnStatusChange).toBe('function');
  });

  it('exports setOnArrivalTriggered', () => {
    expect(typeof mod.setOnArrivalTriggered).toBe('function');
  });

  it('exports setOnStationaryUpdate', () => {
    expect(typeof mod.setOnStationaryUpdate).toBe('function');
  });

  it('exports setOnPermissionChange', () => {
    expect(typeof mod.setOnPermissionChange).toBe('function');
  });

  it('exports listRegisteredGeofences', () => {
    expect(typeof mod.listRegisteredGeofences).toBe('function');
  });

  it('exports getAuthorizationStatus', () => {
    expect(typeof mod.getAuthorizationStatus).toBe('function');
  });

  it('exports requestLocationPermission', () => {
    expect(typeof mod.requestLocationPermission).toBe('function');
  });

  it('exports TRANSITION_ENTER, TRANSITION_EXIT, TRANSITION_DWELL constants', () => {
    expect(mod.TRANSITION_ENTER).toBe(1);
    expect(mod.TRANSITION_EXIT).toBe(2);
    expect(mod.TRANSITION_DWELL).toBe(4);
  });

  it('exports getActiveCandidates', () => {
    expect(typeof mod.getActiveCandidates).toBe('function');
  });

  it('exports clearAllGeofences', () => {
    expect(typeof mod.clearAllGeofences).toBe('function');
  });

  it('exports registerAllActiveGeofences', () => {
    expect(typeof mod.registerAllActiveGeofences).toBe('function');
  });

  it('exports processLocationSample', () => {
    expect(typeof mod.processLocationSample).toBe('function');
  });
});
