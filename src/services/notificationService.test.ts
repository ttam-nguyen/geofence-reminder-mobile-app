// Unit tests for notificationService — mocked notifee.
// Tests the service interface without requiring native modules.

import {
  notificationService,
  AuthorizationStatus,
  ScheduledNotification,
  NotificationChannel,
} from './notificationService';

// Mock notifee module.
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(),
    getNotificationSettings: jest.fn(),
    displayNotification: jest.fn(),
    createTriggerNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
    getTriggerNotificationIds: jest.fn(),
    getTriggerNotifications: jest.fn(),
    createChannel: jest.fn(),
    getChannels: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 3,
  },
  TriggerType: {
    TIMESTAMP: 0,
    INTERVAL: 1,
  },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

import notifee from '@notifee/react-native';

const mockedNotifee = notifee as jest.Mocked<typeof notifee>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  jest.clearAllMocks();
}

// ---------------------------------------------------------------------------
// requestPermission
// ---------------------------------------------------------------------------

describe('requestPermission', () => {
  beforeEach(resetMocks);

  it('returns "authorized" when notifee returns AUTHORIZED', async () => {
    mockedNotifee.requestPermission.mockResolvedValue({
      authorizationStatus: 1, // AUTHORIZED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: 1 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.requestPermission();
    expect(status).toBe('authorized');
    expect(mockedNotifee.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('returns "denied" when notifee returns DENIED', async () => {
    mockedNotifee.requestPermission.mockResolvedValue({
      authorizationStatus: 0, // DENIED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: 0 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.requestPermission();
    expect(status).toBe('denied');
  });

  it('returns "unspecified" when notifee returns NOT_DETERMINED', async () => {
    mockedNotifee.requestPermission.mockResolvedValue({
      authorizationStatus: -1, // NOT_DETERMINED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: -1 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.requestPermission();
    expect(status).toBe('unspecified');
  });

  it('returns "denied" on exception', async () => {
    mockedNotifee.requestPermission.mockRejectedValue(new Error('native error'));

    const status = await notificationService.requestPermission();
    expect(status).toBe('denied');
  });
});

// ---------------------------------------------------------------------------
// checkPermission
// ---------------------------------------------------------------------------

describe('checkPermission', () => {
  beforeEach(resetMocks);

  it('returns "authorized" when settings show AUTHORIZED', async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 1, // AUTHORIZED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: 1 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.checkPermission();
    expect(status).toBe('authorized');
  });

  it('returns "denied" when settings show DENIED', async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 0, // DENIED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: 0 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.checkPermission();
    expect(status).toBe('denied');
  });

  it('returns "unspecified" when settings show NOT_DETERMINED', async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: -1, // NOT_DETERMINED
      ios: { alert: 1, badge: 1, criticalAlert: 1, showPreviews: 1, sound: 1, carPlay: 1, lockScreen: 1, announcement: 1, notificationCenter: 1, inAppNotificationSettings: 1, authorizationStatus: -1 },
      android: { alarm: 0 as any },
      web: {},
    });

    const status = await notificationService.checkPermission();
    expect(status).toBe('unspecified');
  });

  it('returns "denied" on exception', async () => {
    mockedNotifee.getNotificationSettings.mockRejectedValue(new Error('native error'));

    const status = await notificationService.checkPermission();
    expect(status).toBe('denied');
  });
});

// ---------------------------------------------------------------------------
// displayNotification (immediate)
// ---------------------------------------------------------------------------

describe('displayNotification', () => {
  beforeEach(resetMocks);

  it('calls displayNotification with correct payload', async () => {
    mockedNotifee.displayNotification.mockResolvedValue('test-notif-1');
    mockedNotifee.getChannels.mockResolvedValue([]);

    const notif: ScheduledNotification = {
      id: 'test-notif-1',
      title: 'Test Title',
      body: 'Test Body',
      data: { reminderId: '123' },
      trigger: 'immediate',
      android: { channelId: 'gps_reminder_default', importance: 3 },
      ios: { sound: 'default' },
    };

    const id = await notificationService.displayNotification(notif as any);
    expect(id).toBe('test-notif-1');
    expect(mockedNotifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-notif-1',
        title: 'Test Title',
        body: 'Test Body',
        data: { reminderId: '123' },
      }),
    );
  });

  it('omits null sound values from payload', async () => {
    mockedNotifee.displayNotification.mockResolvedValue('test-notif-2');
    mockedNotifee.getChannels.mockResolvedValue([]);

    const notif: ScheduledNotification = {
      id: 'test-notif-2',
      title: 'Silent Test',
      trigger: 'immediate',
      android: { channelId: 'gps_reminder_default', sound: null },
    };

    await notificationService.displayNotification(notif as any);
    const callArgs = mockedNotifee.displayNotification.mock.calls[0][0] as any;
    expect(callArgs.android?.sound).toBeUndefined();
  });

  it('throws on native failure', async () => {
    mockedNotifee.displayNotification.mockRejectedValue(new Error('native fail'));
    mockedNotifee.getChannels.mockResolvedValue([]);

    const notif: ScheduledNotification = {
      id: 'fail-notif',
      title: 'Fail',
      trigger: 'immediate',
    };

    await expect(notificationService.displayNotification(notif as any)).rejects.toThrow('native fail');
  });
});

// ---------------------------------------------------------------------------
// scheduleNotification (future timestamp)
// ---------------------------------------------------------------------------

describe('scheduleNotification', () => {
  beforeEach(resetMocks);

  it('calls createTriggerNotification for future timestamps', async () => {
    mockedNotifee.createTriggerNotification.mockResolvedValue('scheduled-1');
    mockedNotifee.getChannels.mockResolvedValue([]);

    const futureTime = Date.now() + 60_000; // 1 minute from now
    const notif: ScheduledNotification = {
      id: 'scheduled-1',
      title: 'Future Reminder',
      trigger: { timestamp: futureTime },
    };

    const id = await notificationService.scheduleNotification(notif);
    expect(id).toBe('scheduled-1');
    expect(mockedNotifee.createTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'scheduled-1', title: 'Future Reminder' }),
      expect.objectContaining({ type: 0, timestamp: futureTime }), // TriggerType.TIMESTAMP = 0
    );
  });

  it('calls displayNotification for immediate trigger', async () => {
    mockedNotifee.displayNotification.mockResolvedValue('immediate-1');
    mockedNotifee.getChannels.mockResolvedValue([]);

    const notif: ScheduledNotification = {
      id: 'immediate-1',
      title: 'Immediate',
      trigger: 'immediate',
    };

    const id = await notificationService.scheduleNotification(notif);
    expect(id).toBe('immediate-1');
    expect(mockedNotifee.displayNotification).toHaveBeenCalled();
    expect(mockedNotifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('calls displayNotification when trigger is undefined', async () => {
    mockedNotifee.displayNotification.mockResolvedValue('no-trigger-1');
    mockedNotifee.getChannels.mockResolvedValue([]);

    const notif: ScheduledNotification = {
      id: 'no-trigger-1',
      title: 'No Trigger',
    };

    await notificationService.scheduleNotification(notif);
    expect(mockedNotifee.displayNotification).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// cancelNotification / cancelAllNotifications
// ---------------------------------------------------------------------------

describe('cancel notifications', () => {
  beforeEach(resetMocks);

  it('calls cancelNotification with the given ID', async () => {
    mockedNotifee.cancelNotification.mockResolvedValue(undefined);

    await notificationService.cancelNotification('notif-123');
    expect(mockedNotifee.cancelNotification).toHaveBeenCalledWith('notif-123');
  });

  it('ignores cancellation errors', async () => {
    mockedNotifee.cancelNotification.mockRejectedValue(new Error('not found'));

    await expect(notificationService.cancelNotification('nonexistent')).resolves.toBeUndefined();
  });

  it('calls cancelAllNotifications', async () => {
    mockedNotifee.cancelAllNotifications.mockResolvedValue(undefined);

    await notificationService.cancelAllNotifications();
    expect(mockedNotifee.cancelAllNotifications).toHaveBeenCalledTimes(1);
  });

  it('ignores cancelAll errors', async () => {
    mockedNotifee.cancelAllNotifications.mockRejectedValue(new Error('native fail'));

    await expect(notificationService.cancelAllNotifications()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getScheduledNotificationIds / getScheduledNotifications
// ---------------------------------------------------------------------------

describe('scheduled notifications', () => {
  beforeEach(resetMocks);

  it('returns trigger notification IDs', async () => {
    mockedNotifee.getTriggerNotificationIds.mockResolvedValue(['id-1', 'id-2']);

    const ids = await notificationService.getScheduledNotificationIds();
    expect(ids).toEqual(['id-1', 'id-2']);
  });

  it('returns empty array on error', async () => {
    mockedNotifee.getTriggerNotificationIds.mockRejectedValue(new Error('fail'));

    const ids = await notificationService.getScheduledNotificationIds();
    expect(ids).toEqual([]);
  });

  it('maps trigger notifications to our format', async () => {
    mockedNotifee.getTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: 'sched-1',
          title: 'Scheduled Title',
          body: 'Scheduled Body',
          data: { reminderId: '456' },
          android: { channelId: 'gps_reminder_default', sound: 'default' },
          ios: { sound: 'default' },
        },
        trigger: { type: 0, timestamp: Date.now() + 60_000 },
      },
    ]);

    const notifications = await notificationService.getScheduledNotifications();
    expect(notifications).toEqual([
      {
        id: 'sched-1',
        title: 'Scheduled Title',
        body: 'Scheduled Body',
        data: { reminderId: '456' },
        android: { channelId: 'gps_reminder_default', sound: 'default' },
        ios: { sound: 'default' },
      },
    ]);
  });

  it('converts non-string data values to strings', async () => {
    mockedNotifee.getTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: 'sched-2',
          title: 'Mixed Data',
          data: { count: 42, reminderId: '789' },
        },
        trigger: { type: 0, timestamp: Date.now() + 60_000 },
      },
    ]);

    const notifications = await notificationService.getScheduledNotifications();
    expect(notifications[0].data).toEqual({ count: '42', reminderId: '789' });
  });

  it('returns empty array on error', async () => {
    mockedNotifee.getTriggerNotifications.mockRejectedValue(new Error('fail'));

    const notifications = await notificationService.getScheduledNotifications();
    expect(notifications).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createChannel / getChannels
// ---------------------------------------------------------------------------

describe('channels', () => {
  beforeEach(resetMocks);

  it('creates a channel with correct properties', async () => {
    mockedNotifee.createChannel.mockResolvedValue('chan-1');

    const channel: NotificationChannel = {
      id: 'chan-1',
      name: 'Test Channel',
      description: 'A test channel',
      sound: 'default',
      vibrationPattern: [200, 100, 200],
      importance: 3,
    };

    const id = await notificationService.createChannel(channel);
    expect(id).toBe('chan-1');
    expect(mockedNotifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chan-1',
        name: 'Test Channel',
      }),
    );
  });

  it('throws on native failure', async () => {
    mockedNotifee.createChannel.mockRejectedValue(new Error('native fail'));

    const channel: NotificationChannel = {
      id: 'bad-channel',
      name: 'Bad Channel',
    };

    await expect(notificationService.createChannel(channel)).rejects.toThrow('native fail');
  });

  it('maps channels to our format', async () => {
    mockedNotifee.getChannels.mockResolvedValue([
      {
        id: 'chan-1',
        name: 'Test Channel',
        description: 'A test channel',
        importance: 3,
        sound: 'default',
        vibrationPattern: [200, 100, 200],
        blocked: false,
      },
    ]);

    const channels = await notificationService.getChannels();
    expect(channels).toEqual([
      {
        id: 'chan-1',
        name: 'Test Channel',
        description: 'A test channel',
        importance: 3,
        sound: 'default',
        vibrationPattern: [200, 100, 200],
      },
    ]);
  });

  it('returns empty array on error', async () => {
    mockedNotifee.getChannels.mockRejectedValue(new Error('fail'));

    const channels = await notificationService.getChannels();
    expect(channels).toEqual([]);
  });
});
