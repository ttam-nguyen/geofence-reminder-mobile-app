//  GeofenceManager.swift
//  GPSReminder
//
//  iOS native module wrapping Core Location for geofence monitoring.
//  Manages CLCircularRegion registration, permission states, and event emission.

import Foundation
import CoreLocation
import React

@objc(GeofenceManager)
class GeofenceManager: RCTEventEmitter {
  
  private let locationManager = CLLocationManager()
  private var registeredRegions: [String: CLCircularRegion] = [:]
  private var eventSender: RCTEventSenderProtocol?
  
  override class func moduleName() -> String! {
    return "GeofencingModule"
  }
  
  override class func methodsToExport() -> [String]! {
    return [
      "registerGeofence",
      "unregisterGeofence",
      "unregisterAllGeofences",
      "checkPermissions",
      "requestLocationPermission",
      "requestBackgroundPermission",
      "isGooglePlayServicesAvailable",
    ]
  }
  
  override func supportedEvents() -> [String]! {
    return ["GeofenceEvent"]
  }
  
  override func startObserving() {
    locationManager.delegate = self
    eventSender = self.responds(to: #selector(sendEvent)) ? self.sendEvent : nil
  }
  
  // MARK: - Register Geofence
  
  @objc func registerGeofence(_ params: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let requestId = params["requestId"] as? String else {
      reject("INVALID_PARAMS", "requestId is required", nil)
      return
    }
    
    guard let latitude = params["latitude"] as? Double else {
      reject("INVALID_PARAMS", "latitude is required", nil)
      return
    }
    
    guard let longitude = params["longitude"] as? Double else {
      reject("INVALID_PARAMS", "longitude is required", nil)
      return
    }
    
    guard let radiusMeters = params["radiusMeters"] as? Double else {
      reject("INVALID_PARAMS", "radiusMeters is required", nil)
      return
    }
    
    let notifyOnEntry = params["notifyOnEntry"] as? Bool ?? true
    let notifyOnExit = params["notifyOnExit"] as? Bool ?? false
    
    // Check permission first
    let status = locationManager.authorizationStatus
    if status == .denied || status == .restricted {
      reject("PERMISSION_DENIED", "Location permission is denied or restricted", nil)
      return
    }
    
    // iOS limit: 20 regions maximum
    if registeredRegions.count >= 20 {
      reject("REGION_LIMIT_EXCEEDED", "iOS supports a maximum of 20 geofences. Current count: \(registeredRegions.count)", nil)
      return
    }
    
    let region = CLCircularRegion(
      center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
      radius: radiusMeters,
      identifier: requestId
    )
    
    region.notifyOnEntry = notifyOnEntry
    region.notifyOnExit = notifyOnExit
    
    // Set monitoring priority (higher precision for smaller radii)
    if radiusMeters <= 50 {
      region.monitoredRegionsPriority = .high
    } else {
      region.monitoredRegionsPriority = .normal
    }
    
    registeredRegions[requestId] = region
    locationManager.startMonitoring(for: region)
    
    resolve(["success": true])
  }
  
  // MARK: - Unregister Geofence
  
  @objc func unregisterGeofence(_ requestId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let region = registeredRegions[requestId] else {
      reject("NOT_FOUND", "Geofence with id \(requestId) not found", nil)
      return
    }
    
    locationManager.stopMonitoring(for: region)
    registeredRegions.removeValue(forKey: requestId)
    resolve(["success": true])
  }
  
  // MARK: - Unregister All
  
  @objc func unregisterAllGeofences(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    for region in registeredRegions.values {
      locationManager.stopMonitoring(for: region)
    }
    registeredRegions.removeAll()
    resolve(["success": true])
  }
  
  // MARK: - Check Permissions
  
  @objc func checkPermissions(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let locationPermission: String
    
    switch locationManager.authorizationStatus {
    case .notDetermined:
      locationPermission = "never_asked"
    case .denied, .restricted:
      locationPermission = locationManager.authorizationStatus == .restricted ? "restricted" : "denied"
    case .authorizedAlways, .authorizedWhenInUse:
      locationPermission = "granted"
    @unknown default:
      locationPermission = "never_asked"
    }
    
    // iOS notification permission (iOS 10+)
    let notificationPermission: String
    if #available(iOS 10.0, *) {
      let center = UNUserNotificationCenter.current()
      center.getNotificationSettings { settings in
        switch settings.authorizationStatus {
        case .denied:
          resolve([
            "locationPermission": locationPermission,
            "notificationPermission": "denied",
            "backgroundLocationAllowed": locationManager.allowsBackgroundLocationUpdates,
          ])
        case .restricted:
          resolve([
            "locationPermission": locationPermission,
            "notificationPermission": "denied", // Treated as denied for notifications
            "backgroundLocationAllowed": locationManager.allowsBackgroundLocationUpdates,
          ])
        case .notDetermined:
          resolve([
            "locationPermission": locationPermission,
            "notificationPermission": "never_asked",
            "backgroundLocationAllowed": locationManager.allowsBackgroundLocationUpdates,
          ])
        case .authorized:
          resolve([
            "locationPermission": locationPermission,
            "notificationPermission": "granted",
            "backgroundLocationAllowed": locationManager.allowsBackgroundLocationUpdates,
          ])
        @unknown default:
          resolve([
            "locationPermission": locationPermission,
            "notificationPermission": "never_asked",
            "backgroundLocationAllowed": locationManager.allowsBackgroundLocationUpdates,
          ])
        }
      }
    } else {
      resolve([
        "locationPermission": locationPermission,
        "notificationPermission": "never_asked",
        "backgroundLocationAllowed": false,
      ])
    }
  }
  
  // MARK: - Request Location Permission
  
  @objc func requestLocationPermission(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Request "When In Use" authorization
    locationManager.requestWhenInUseAuthorization()
    
    // The actual result is async via CLLocationManagerDelegate.
    // For now, return "never_asked" — the delegate will update via checkPermissions.
    resolve("never_asked")
  }
  
  // MARK: - Request Background Permission
  
  @objc func requestBackgroundPermission(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Request "Always" authorization (triggers the system alert)
    locationManager.requestAlwaysAuthorization()
    
    // The result is async — return true to indicate the request was sent
    resolve(true)
  }
  
  // MARK: - Google Play Services (iOS stub)
  
  @objc func isGooglePlayServicesAvailable(_ resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Always true on iOS (Android-only check)
    resolve(true)
  }
  
  // MARK: - CLLocationManagerDelegate
  
  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    sendGeofenceEvent(region: region, eventType: "ENTER")
  }
  
  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    sendGeofenceEvent(region: region, eventType: "EXIT")
  }
  
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    // Log monitoring errors (permission revoked while monitoring, etc.)
    print("[GeofenceManager] Monitoring error: \(error.localizedDescription)")
  }
  
  private func sendGeofenceEvent(region: CLRegion, eventType: String) {
    guard let circularRegion = region as? CLCircularRegion else { return }
    
    let body: [String: Any] = [
      "requestId": circularRegion.identifier,
      "eventType": eventType,
      "timestamp": Date().timeIntervalSince1970 * 1000,
      "latitude": circularRegion.center.latitude,
      "longitude": circularRegion.center.longitude,
      "horizontalAccuracy": circularRegion.radius,
    ]
    
    sendEvent(withName: "GeofenceEvent", body: body)
  }
}
