// Mock for react-native-geolocation-service — provides no-op geolocation for tests.

const mockPosition = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 100,
    altitude: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

const requestAuthorization = jest.fn().mockResolvedValue('granted');
const getCurrentPosition = jest.fn((successCb) => {
  setTimeout(() => successCb(mockPosition), 0);
});
const watchPosition = jest.fn();
const clearWatch = jest.fn();
const stopObserving = jest.fn();

module.exports = {
  __esModule: true,
  default: {
    requestAuthorization,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    stopObserving,
  },
  requestAuthorization,
  getCurrentPosition,
  watchPosition,
  clearWatch,
  stopObserving,
};
