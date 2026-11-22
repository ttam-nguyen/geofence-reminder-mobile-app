// GeofencingManager.swift
// GPSReminder
// Task 8.2: iOS CoreLocation-based geofence registration, monitoring, and event emission.
//
// This module wraps CLLocationManager for region monitoring (outer 200m boundary)
// and bounded high-accuracy location updates during ARRIVAL_PENDING for stationary
// qualification (speed < 2 mph for 120s).
//
// Replaces SpikeModule after Task 8.1 passes.

import CoreLocation
import React

// MARK: - Constants

/// Production geofence radius — fixed, not user-editable.
private let GEOFAENCE_RADIUS: Double = 200.0

/// Speed threshold for stationary qualification: strictly below 2 mph (0.89408 m/s).
private let STATIONARY_SPEED_THRESHOLD: Double = 0.89408

/// Stationary confirmation duration: 120 consecutive seconds.
private let STATIONARY_DURATION_SECONDS: TimeInterval = 120.0

/// Maximum horizontal accuracy (meters) — samples beyond this are considered indeterminate.
private let MAX_HORIZONTAL_ACCURACY: Double = 50.0

// MARK: - GeofencingManager

/// CoreLocation-based geofence manager for iOS.
@objc(GeofencingManager)
final class GeofencingManager: NSObject, RCTEventEmitter {
    
    private let queue = DispatchQueue(label: "com.gpsreminder.geofencing", qos: .userInitiated)
    
    /// The CoreLocation manager handling region monitoring.
    private let locationManager: CLLocationManager
    
    /// Registered geofences: reminderId → CLCircularRegion.
    private var registeredGeofences: [String: CLCircularRegion] = [:]
    
    /// Active arrival candidates: reminderId → ArrivalCandidate.
    private var arrivalCandidates: [String: ArrivalCandidate] = [:]
    
    /// Maximum number of monitored regions (iOS limit).
    private let maxRegions: Int = 20
    
    /// Event constant names for JS bridge.
    static let EventGeofenceEnter = "geofenceEnter"
    static let EventGeofenceExit = "geofenceExit"
    static let EventLocationUpdate = "locationUpdate"
    
    // RCTEventEmitter protocol
    
    @objc override static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    override static func moduleName() -> String! {
        return "GeofencingModule"
    }
    
    @objc
    override static func provider() -> RCTEventEmitterProvider {
        return .module
    }
    
    @objc
    override static func constantsToExport() -> [AnyHashable: Any] {
        return [
            "EVENT_GEOFENCE_ENTER": GeofencingManager.EventGeofenceEnter,
            "EVENT_GEOFENCE_EXIT": GeofencingManager.EventGeofenceExit,
            "EVENT_LOCATION_UPDATE": GeofencingManager.EventLocationUpdate,
        ]
    }
    
    override func supportedEvents() -> [String]! {
        return [
            GeofencingManager.EventGeofenceEnter,
            GeofencingManager.EventGeofenceExit,
            GeofencingManager.EventLocationUpdate,
        ]
    }
    
    // MARK: - Initialization
    
    @objc
    override init() {
        self.locationManager = CLLocationManager()
        super.init()
        
        self.locationManager.delegate = self
        self.locationManager.desiredAccuracy = kCLLocationAccuracyBest
        self.locationManager.distanceFilter = kCLDistanceFilterNone
    }
    
    // MARK: - Public API (called from JavaScript)
    
    /// Register a geofence for the given reminder.
    @objc
    func registerGeofence(
        _ reminderId: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            do {
                try self.validateCanRegisterMoreRegions()
                
                let region = CLCircularRegion(
                    center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
                    radius: max(radius, GEOFAENCE_RADIUS),
                    identifier: reminderId
                )
                region.notifyOnEntry = true
                region.notifyOnExit = true
                
                self.registeredGeofences[reminderId] = region
                self.locationManager.startMonitoring(for: region)
                
                resolve(nil)
            } catch {
                reject("REGISTER_ERROR", error.localizedDescription, error)
            }
        }
    }
    
    /// Unregister a geofence for the given reminder.
    @objc
    func unregisterGeofence(
        _ reminderId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard let region = self.registeredGeofences.removeValue(forKey: reminderId) else {
                resolve(nil)  // Already unregistered — not an error.
                return
            }
            
            self.locationManager.stopMonitoring(for: region)
            self.arrivalCandidates.removeValue(forKey: reminderId)
            
            resolve(nil)
        }
    }
    
    /// List all registered geofences.
    @objc
    func listRegisteredGeofences(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            let geofences = self.registeredGeofences.map { reminderId, region in
                [
                    "reminderId": reminderId,
                    "latitude": region.center.latitude,
                    "longitude": region.center.longitude,
                    "radius": region.radius,
                ] as [String: Any]
            }
            resolve(geofences)
        }
    }
    
    /// Get the current location permission status.
    @objc
    func getAuthorizationStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let status = CLLocationManager.authorizationStatus()
        switch status {
        case .notDetermined:
            resolve("unspecified")
        case .restricted, .denied:
            resolve("denied")
        case .authorizedAlways, .authorizedWhenInUse:
            resolve("granted")
        @unknown default:
            resolve("unspecified")
        }
    }
    
    /// Request location permission.
    @objc
    func requestLocationPermission(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        self.locationManager.requestWhenInUseAuthorization()
        resolve(nil)
    }
    
    // MARK: - Internal helpers
    
    /// Validate that we can register more regions without exceeding iOS limits.
    private func validateCanRegisterMoreRegions() throws {
        if self.registeredGeofences.count >= self.maxRegions {
            throw GeofencingError.capacityExceeded(
                "iOS limit of \(self.maxRegions) monitored regions reached"
            )
        }
    }
    
    /// Emit an event to JavaScript.
    private func emitEvent(_ name: String, body: [String: Any]) {
        self.sendEvent(withName: name, body: body)
    }
}

// MARK: - CLLocationManagerDelegate

extension GeofencingManager: CLLocationManagerDelegate {
    
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        // Surface permission changes to JS.
        var body: [String: Any] = ["permissionStatus": "\(status)"]
        #if DEBUG
        body["debug"] = true
        #endif
        self.emitEvent("authorizationDidChange", body: body)
    }
    
    func locationManager(_ manager: CLLocationManager, didStartMonitoringFor region: CLCircularRegion) {
        // Region monitoring started successfully. No JS event needed — the caller knows it was registered.
    }
    
    func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLCircularRegion?, withError error: Error) {
        // Region monitoring failed — log but don't crash.
        #if DEBUG
        print("[Geofencing] monitoringDidFailFor: \(error.localizedDescription)")
        #endif
    }
    
    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLCircularRegion) {
        // Geofence ENTER event.
        let reminderId = region.identifier
        
        #if DEBUG
        print("[Geofencing] ENTER: \(reminderId) at \(region.center.latitude),\(region.center.longitude)")
        #endif
        
        self.emitEvent(GeofencingManager.EventGeofenceEnter, body: [
            "reminderId": reminderId,
            "latitude": region.center.latitude,
            "longitude": region.center.longitude,
            "timestamp": Date().timeIntervalSince1970 * 1000,  // ms
        ])
        
        // Start arrival candidate (bounded location updates for stationary qualification).
        self.startArrivalCandidate(reminderId, coordinate: region.center)
    }
    
    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLCircularRegion) {
        // Geofence EXIT event.
        let reminderId = region.identifier
        
        #if DEBUG
        print("[Geofencing] EXIT: \(reminderId)")
        #endif
        
        self.emitEvent(GeofencingManager.EventGeofenceExit, body: [
            "reminderId": reminderId,
            "timestamp": Date().timeIntervalSince1970 * 1000,  // ms
        ])
        
        // Cancel the arrival candidate and stop bounded location updates.
        self.cancelArrivalCandidate(reminderId)
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Handle location updates from the bounded session (during ARRIVAL_PENDING).
        guard let latest = locations.last else { return }
        
        // Process the location for stationary qualification.
        self.processLocationUpdate(latest)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        #if DEBUG
        print("[Geofencing] didFailWithError: \(error.localizedDescription)")
        #endif
    }
    
    // MARK: - Arrival candidate management
    
    /// Start an arrival candidate for the given reminder (entered geofence).
    private func startArrivalCandidate(_ reminderId: String, coordinate: CLLocationCoordinate2D) {
        // Don't start multiple candidates for the same reminder.
        guard self.arrivalCandidates[reminderId] == nil else { return }
        
        self.arrivalCandidates[reminderId] = ArrivalCandidate(
            reminderId: reminderId,
            targetCoordinate: coordinate,
            geofenceRadius: GEOFAENCE_RADIUS
        )
        
        // Start bounded high-accuracy location updates for stationary qualification.
        self.locationManager.startUpdatingLocation()
    }
    
    /// Cancel an arrival candidate (exited geofence or manually cancelled).
    private func cancelArrivalCandidate(_ reminderId: String) {
        self.arrivalCandidates.removeValue(forKey: reminderId)
        
        // Stop bounded location updates to save battery.
        self.locationManager.stopUpdatingLocation()
    }
    
    /// Process a location update for stationary qualification.
    private func processLocationUpdate(_ location: CLLocation) {
        guard let candidate = self.arrivalCandidates.values.first(where: { $0.isActive }) else {
            return  // No active candidate.
        }
        
        let updated = candidate.processLocationUpdate(location)
        
        if let reminderId = updated.reminderId {
            self.emitEvent(GeofencingManager.EventLocationUpdate, body: [
                "reminderId": reminderId,
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "speed": location.speed >= 0 ? location.speed : NSNull(),
                "speedAccuracy": location.speedAccuracy >= 0 ? location.speedAccuracy : NSNull(),
                "horizontalAccuracy": location.horizontalAccuracy,
                "stationaryTimeMs": updated.accumulatedStationaryTimeMs,
                "isActive": updated.isActive,
                "isQualified": updated.isQualified,
            ])
        }
    }
}

// MARK: - ArrivalCandidate

/// Tracks stationary qualification for a reminder inside its geofence.
private final class ArrivalCandidate {
    let reminderId: String
    let targetCoordinate: CLLocationCoordinate2D
    let geofenceRadius: Double
    
    private(set) var accumulatedStationaryTimeMs: TimeInterval = 0
    private(set) var isActive: Bool = true
    private(set) var isQualified: Bool = false
    
    private var lastQualifyingLocation: CLLocation?
    private var lastNonQualifyingTime: Date?
    
    init(reminderId: String, targetCoordinate: CLLocationCoordinate2D, geofenceRadius: Double) {
        self.reminderId = reminderId
        self.targetCoordinate = targetCoordinate
        self.geofenceRadius = geofenceRadius
    }
    
    /// Process a location update for stationary qualification.
    /// Returns self (updated) or nil if the candidate is no longer active.
    @discardableResult
    func processLocationUpdate(_ location: CLLocation) -> ArrivalCandidate {
        // Check if still inside the geofence.
        let distance = location.distance(from: CLLocation(latitude: self.targetCoordinate.latitude, longitude: self.targetCoordinate.longitude))
        
        if distance > self.geofenceRadius {
            // User exited the geofence — cancel this candidate.
            self.isActive = false
            return self
        }
        
        // Validate the location sample.
        let isValid = self.isValidSample(location)
        
        if !isValid {
            // Invalid/stale/insufficient-quality sample: pause (do not reset) the timer.
            return self
        }
        
        // Check if speed is below threshold.
        let isBelowThreshold = self.speedIsBelowThreshold(location)
        
        if isBelowThreshold {
            // Qualifying sample: accumulate time.
            if let lastLocation = self.lastQualifyingLocation {
                let elapsed = location.timestamp.timeIntervalSince(lastLocation.timestamp) * 1000  // ms
                if elapsed > 0 {
                    self.accumulatedStationaryTimeMs += elapsed
                }
            }
            self.lastQualifyingLocation = location
            
            // Check if stationary duration is complete.
            if self.accumulatedStationaryTimeMs >= STATIONARY_DURATION_SECONDS * 1000 {
                self.isQualified = true
                #if DEBUG
                print("[Geofencing] Stationary qualified for \(self.reminderId) after \(self.accumulatedStationaryTimeMs / 1000)s")
                #endif
            }
        } else {
            // Speed at/above threshold: reset the stationary timer.
            self.accumulatedStationaryTimeMs = 0
            self.isQualified = false
        }
        
        return self
    }
    
    /// Check if a location sample is valid (fresh, accurate enough).
    private func isValidSample(_ location: CLLocation) -> Bool {
        // Must have a timestamp within a reasonable window (5 minutes).
        let maxAge: TimeInterval = 300  // 5 minutes
        if Date().timeIntervalSince(location.timestamp) > maxAge {
            return false
        }
        
        // Horizontal accuracy must be within acceptable range.
        if location.horizontalAccuracy < 0 || location.horizontalAccuracy > MAX_HORIZONTAL_ACCURACY {
            return false
        }
        
        return true
    }
    
    /// Check if the location's speed is below the stationary threshold.
    private func speedIsBelowThreshold(_ location: CLLocation) -> Bool {
        // If speed is valid and below threshold, it qualifies.
        if location.speed >= 0 {
            return location.speed < STATIONARY_SPEED_THRESHOLD
        }
        
        // If speed is invalid (negative), treat as indeterminate (do not count).
        return false
    }
}

// MARK: - Errors

enum GeofencingError: Error {
    case capacityExceeded(String)
    case notRegistered(String)
    case invalidParameters(String)
}
