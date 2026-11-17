// Mock for @op-engineering/op-sqlite — provides no-op database operations for Jest.

var _inMemoryStore = new Map();
var _dbExists = false;

function mockDb() {
  return {
    execute: jest.fn(function(query, params) {
      // Handle PRAGMA user_version queries
      if (query.startsWith('PRAGMA user_version')) {
        return { rows: [{ user_version: _dbExists ? 1 : 0 }], rowsAffected: 0 };
      }

      // Handle CREATE TABLE — mark DB as existing
      if (query.includes('CREATE TABLE')) {
        _dbExists = true;
        return { rows: [], rowsAffected: 0 };
      }

      // Handle INSERT OR REPLACE — store in memory
      if (query.includes('INSERT OR REPLACE')) {
        var id = params ? params[0] : undefined;
        if (id) _inMemoryStore.set(id, params);
        return { rows: [], rowsAffected: 1, insertId: 1 };
      }

      // Handle SELECT queries
      if (query.startsWith('SELECT')) {
        var fromMatch = query.match(/FROM\s+reminders/);
        if (!fromMatch) return { rows: [], rowsAffected: 0 };

        var whereMatch = query.match(/WHERE\s+(.+)$/);
        var filtered = Array.from(_inMemoryStore.values());

        if (whereMatch) {
          var whereClause = whereMatch[1];
          // Handle status filter: WHERE status = ?
          var statusMatch = whereClause.match(/status\s*=\s*\?/);
          if (statusMatch && params && params[0]) {
            filtered = filtered.filter(function(p) { return p[8] === params[0]; });
          }
          // Handle WHERE id = ?
          var idMatch2 = whereClause.match(/id\s*=\s*\?/);
          if (idMatch2 && params && params[0]) {
            filtered = filtered.filter(function(p) { return p[0] === params[0]; });
          }
          // Handle WHERE status NOT IN (...)
          var notInMatch = whereClause.match(/NOT IN\s*\((.+)\)/);
          if (notInMatch) {
            var excludedStatuses = notInMatch[1].split(',').map(function(s) { return s.trim().replace(/'/g, ''); });
            filtered = filtered.filter(function(p) {
              var status = p[8];
              return excludedStatuses.indexOf(status) === -1;
            });
          }
        }

        var rows = filtered.map(function(p) {
          return {
            id: p[0], title: p[1], description: p[2] || null,
            latitude: p[3], longitude: p[4], locationName: p[5] || null,
            radiusMeters: p[6], locationSource: p[7], status: p[8],
            createdAt: p[9], updatedAt: p[10], triggeredAt: p[11] || null,
            completedAt: p[12] || null,
            notificationSoundEnabled: p[13], notificationVibrationEnabled: p[14],
          };
        });

        return { rows: rows, rowsAffected: 0 };
      }

      // Handle DELETE FROM reminders
      if (query.startsWith('DELETE FROM')) {
        var idMatch = query.match(/id\s*=\s*\?/);
        if (idMatch && params && params[0]) {
          var existed = _inMemoryStore.has(params[0]);
          _inMemoryStore.delete(params[0]);
          return { rows: [], rowsAffected: existed ? 1 : 0 };
        }
        _inMemoryStore.clear();
        return { rows: [], rowsAffected: 0 };
      }

      return { rows: [], rowsAffected: 0 };
    }),
    transaction: jest.fn(async function(fn) {
      await fn({
        execute: jest.fn(function(query, params) {
          if (query.startsWith('PRAGMA user_version')) {
            return { rows: [{ user_version: _dbExists ? 1 : 0 }], rowsAffected: 0 };
          }
          if (query.includes('CREATE TABLE')) {
            _dbExists = true;
            return { rows: [], rowsAffected: 0 };
          }
          if (query.includes('INSERT OR REPLACE')) {
            var id = params ? params[0] : undefined;
            if (id) _inMemoryStore.set(id, params);
            return { rows: [], rowsAffected: 1, insertId: 1 };
          }
          return { rows: [], rowsAffected: 0 };
        }),
      });
    }),
    close: jest.fn(),
  };
}

module.exports = { open: jest.fn(mockDb), openAsync: jest.fn(mockDb), QueryResult: {} };

// Reset mock state between tests
beforeEach(function() {
  _dbExists = false;
  _inMemoryStore.clear();
});
