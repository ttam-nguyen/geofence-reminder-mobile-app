// SpikeModule.swift
// GPSReminder
// Task 8.1: Compatibility verification for RN 0.88 New Architecture native module bridging.
//
// This is a minimal native module exposing `ping()` and `getPlatform()` to verify that
// custom native modules can be created, linked, and called from JS on RN 0.88 New Architecture.
//
// This module will be REMOVED after Task 8.1 passes and replaced by the full GeofencingManager.

import React

/// A minimal native module for Task 8.1 compatibility verification.
@objc(SpikeModule)
final class SpikeModule: NSObject, RCTBridgeModule {
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    static func moduleName() -> String! {
        return "SpikeModule"
    }
    
    @objc
    static func constantsToExport() -> [AnyHashable: Any] {
        return [:]
    }
    
    /// Returns "ok" — verifies JS → native call works.
    @objc
    func ping(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve("ok")
    }
    
    /// Returns the platform string — verifies native → JS data flow.
    @objc
    func getPlatform(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve("ios")
    }
}
