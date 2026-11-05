/**
 * Location source enum — where the geofence coordinates came from.
 */

export enum LocationSource {
  /** Coordinates from device current GPS location */
  CURRENT_GPS = 'current_gps',

  /** User tapped a point on the map */
  MAP_PIN = 'map_pin',

  /** Coordinates from a place search (Google Places, etc.) */
  PLACE_SEARCH = 'place_search',
}
