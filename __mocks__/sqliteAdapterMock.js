// Mock for src/models/sqliteAdapter.ts — returns InMemoryReminderRepository for Jest.

const { InMemoryReminderRepository } = require('../models/repository');
module.exports = { SQLiteReminderRepository: InMemoryReminderRepository };
