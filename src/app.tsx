/**
 * GPS Reminder — Main Application Entry Point.
 *
 * Uses the ThemeProvider and AppNavigator for full navigation.
 * Initializes SQLite database on startup.
 */

import React, { useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { AppNavigator } from './navigation/AppNavigator';
import { openDatabase } from './data/SQLiteAdapter';
import { startGeofenceEventService } from './services/GeofenceEventService';

export default function App() {
  useEffect(() => {
    // Initialize SQLite database on app startup
    openDatabase()
      .then(() => {
        // Start the geofence event bridge after DB is ready
        startGeofenceEventService();
      })
      .catch((err) => {
        console.error('[App] Failed to initialize database:', err);
      });
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
