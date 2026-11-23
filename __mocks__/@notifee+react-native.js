// Mock for @notifee/react-native.
//
// The real package throws "Notifee native module not found" as soon as it is imported outside a
// real device build, which broke every suite that transitively imports notificationService.
// Tests assert on our own service layer, so a recording no-op is enough.

const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

const EventType = {
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
};

const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};

const AndroidStyle = {
  BIGTEXT: 1,
  BIGPICTURE: 2,
};

let notificationCounter = 0;

const displayedNotifications = [];
const createdChannels = [];
const cancelledNotifications = [];

const notifee = {
  onForegroundEvent: jest.fn(() => jest.fn()),
  onBackgroundEvent: jest.fn(),
  getInitialNotification: jest.fn(async () => null),
  requestPermission: jest.fn(async () => ({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  })),
  getNotificationSettings: jest.fn(async () => ({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
    android: { channelId: 'gps_reminder_default' },
  })),
  getChannels: jest.fn(async () => createdChannels),
  createChannel: jest.fn(async channel => {
    createdChannels.push(channel);
    return channel.id;
  }),
  deleteChannel: jest.fn(async () => undefined),
  displayNotification: jest.fn(async notification => {
    notificationCounter += 1;
    const id = notification.id ?? `mock-notification-${notificationCounter}`;
    displayedNotifications.push({ ...notification, id });
    return id;
  }),
  createTriggerNotification: jest.fn(async (notification, trigger) => {
    notificationCounter += 1;
    const id = notification.id ?? `mock-trigger-${notificationCounter}`;
    displayedNotifications.push({ ...notification, id, trigger });
    return id;
  }),
  cancelNotification: jest.fn(async id => {
    cancelledNotifications.push(id);
  }),
  cancelAllNotifications: jest.fn(async () => undefined),
  cancelTriggerNotifications: jest.fn(async () => undefined),
  getTriggerNotificationIds: jest.fn(async () => []),
  getTriggerNotifications: jest.fn(async () => []),
  getDisplayedNotifications: jest.fn(async () => displayedNotifications),
  setNotificationCategories: jest.fn(async () => undefined),
};

module.exports = {
  __esModule: true,
  default: notifee,
  AuthorizationStatus,
  EventType,
  AndroidImportance,
  TriggerType,
  AndroidStyle,
  // Test helpers.
  __displayedNotifications: displayedNotifications,
  __createdChannels: createdChannels,
  __cancelledNotifications: cancelledNotifications,
};
