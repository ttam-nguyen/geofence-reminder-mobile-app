// Mock for src/stores/reminderStore.ts — returns InMemoryReminderRepository for Jest.

const { InMemoryReminderRepository, ReminderRepository } = require('../src/models/repository');
const { determineInitialStatus } = require('../src/models/initialStatus');

// Re-export for compatibility
module.exports.getStoreVersion = jest.fn(() => 0);
module.exports.subscribe = jest.fn(() => () => {});

const delegate = new InMemoryReminderRepository();
module.exports.store = {
  findById: delegate.findById.bind(delegate),
  findAll: delegate.findAll.bind(delegate),
  save: delegate.save.bind(delegate),
  deleteById: delegate.deleteById.bind(delegate),
  findActive: delegate.findActive.bind(delegate),
  findByStatus: delegate.findByStatus.bind(delegate),
  clear: delegate.clear.bind(delegate),
};

// Export storeReady as a resolved promise (no async seeding needed in tests)
module.exports.storeReady = Promise.resolve();
