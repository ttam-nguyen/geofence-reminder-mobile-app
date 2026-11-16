// Settings store — singleton managing app-wide settings state.
// Follows the same subscribe/version pattern as reminderStore.

import { ReminderStatus } from "../types/Reminder";

/** App-wide settings shape. */
export interface SettingsState {
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  notificationVibrationEnabled: boolean;
}

/** Default settings values. */
export const defaultSettings: SettingsState = {
  notificationsEnabled: true,
  notificationSoundEnabled: true,
  notificationVibrationEnabled: true,
};

/** Version counter — increments on every change. */
let _version = 0;

export function getSettingsVersion(): number {
  return _version;
}

type Listener = () => void;
let listeners: Listener[] = [];

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

let _settings: SettingsState = { ...defaultSettings };

export function getSettings(): SettingsState {
  return _settings;
}

export function setNotificationsEnabled(enabled: boolean) {
  _settings = { ..._settings, notificationsEnabled: enabled };
  _version++;
  notifyListeners();
}

export function setNotificationSoundEnabled(enabled: boolean) {
  _settings = { ..._settings, notificationSoundEnabled: enabled };
  _version++;
  notifyListeners();
}

export function setNotificationVibrationEnabled(enabled: boolean) {
  _settings = { ..._settings, notificationVibrationEnabled: enabled };
  _version++;
  notifyListeners();
}

export function resetSettings() {
  _settings = { ...defaultSettings };
  _version++;
  notifyListeners();
}
