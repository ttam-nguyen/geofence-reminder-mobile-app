// Mock for @react-native-community/geolocation

const mockGetCurrentPosition = jest.fn((success, error) => {
  try {
    success({
      coords: {
        latitude: 37.7849,
        longitude: -122.4094,
        accuracy: 10,
        altitude: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
  } catch (e) {
    error(e);
  }
});

const mockWatchPosition = jest.fn(() => 1);
const mockClearWatch = jest.fn();

module.exports = {
  getCurrentPosition: mockGetCurrentPosition,
  watchPosition: mockWatchPosition,
  clearWatch: mockClearWatch,
};
