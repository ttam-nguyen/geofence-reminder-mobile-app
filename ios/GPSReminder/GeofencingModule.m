//  GeofencingModule.m
//  GPSReminder
//
//  Objective-C bridge file that registers GeofenceManager with React Native.
//  This is the entry point for the native module — it must be linked into the Xcode project.

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(GeofenceManager, RCTEventEmitter)

RCT_EXTERN_METHOD(registerGeofence: (NSDictionary *)params
                  resolver: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(unregisterGeofence: (NSString *)requestId
                  resolver: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(unregisterAllGeofences: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(checkPermissions: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(requestLocationPermission: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(requestBackgroundPermission: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(isGooglePlayServicesAvailable: (RCTPromiseResolveBlock)resolver
                  rejecter: (RCTPromiseRejectBlock)rejecter)

@end
