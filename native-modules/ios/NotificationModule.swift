//
//  NotificationModule.swift
//  GPSReminder
//
//  iOS native notification module — wraps UNUserNotificationCenter.
//  Provides local notification scheduling, cancellation, and permission management.
//

import Foundation
import UserNotifications

@objc(NotificationModule)
class NotificationModule: NSObject {

    @objc
    func scheduleLocalNotification(_ params: NSDictionary, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let notificationId = params["notificationId"] as? String,
              let title = params["title"] as? String,
              let body = params["body"] as? String,
              let soundEnabled = params["soundEnabled"] as? Bool,
              let vibrationEnabled = params["vibrationEnabled"] as? Bool else {
            reject("INVALID_PARAMS", "Missing required parameters", nil)
            return
        }

        let content = UNMutableNotificationContent()
        content.title = NSLocalizedString(title, comment: "")
        content.body = body

        // Sound: use default alert sound if enabled
        if soundEnabled {
            content.sound = .default
        }

        // Custom data payload
        if let data = params["data"] as? [String: String] {
            content.userInfo = data
        }

        // Trigger: fire immediately (for triggered reminders)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)

        let request = UNNotificationRequest(identifier: notificationId, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                reject("SCHEDULE_ERROR", "Failed to schedule notification: \(error.localizedDescription)", error)
            } else {
                resolve(["success": true, "notificationId": notificationId])
            }
        }
    }

    @objc
    func cancelNotification(_ notificationId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationId])
        resolve(["success": true])
    }

    @objc
    func checkNotificationPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized:
                resolve("granted")
            case .denied:
                resolve("denied")
            case .notDetermined:
                resolve("never_asked")
            case .provisional:
                resolve("granted") // Provisional is a form of granted
            case .ephemeral:
                resolve("granted") // Ephemeral is a form of granted
            @unknown default:
                resolve("never_asked")
            }
        }
    }

    @objc
    func requestNotificationPermission(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                reject("REQUEST_ERROR", "Failed to request permission: \(error.localizedDescription)", error)
                return
            }

            if granted {
                resolve("granted")
            } else {
                resolve("denied")
            }
        }
    }

    override init() {
        super.init()
    }
}
