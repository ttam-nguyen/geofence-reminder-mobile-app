// Mock for @react-native-async-storage/async-storage.
//
// The published package ships ES modules, which Jest cannot parse without extra transform
// configuration. A key/value map is enough for the permission-bootstrap flag and the map cache.

const store = new Map();

const AsyncStorage = {
  getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
  setItem: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async key => {
    store.delete(key);
  }),
  mergeItem: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  getAllKeys: jest.fn(async () => Array.from(store.keys())),
  multiGet: jest.fn(async keys => keys.map(key => [key, store.get(key) ?? null])),
  multiSet: jest.fn(async pairs => {
    pairs.forEach(([key, value]) => store.set(key, value));
  }),
  multiRemove: jest.fn(async keys => {
    keys.forEach(key => store.delete(key));
  }),
  clear: jest.fn(async () => {
    store.clear();
  }),
};

module.exports = {
  __esModule: true,
  default: AsyncStorage,
  ...AsyncStorage,
};
