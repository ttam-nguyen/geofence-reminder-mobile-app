// Map screen — placeholder for future map integration.

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

export function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={Typography.h2}>Map</Text>
        <Text style={Typography.bodySmall}>
          Map view will show reminders as pins on a map.
        </Text>
        <Text style={Typography.caption}>
          (Integration planned in Phase 3)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
