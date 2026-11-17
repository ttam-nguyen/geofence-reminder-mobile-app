// Mock for @op-engineering/op-sqlite — provides no-op database operations for Jest.

const mockRows = {
  _array: [],
  item: (index: number) => mockRows._array[index],
  get length() { return mockRows._array.length; },
};

let _dbExists = false;
const _inMemoryStore: Map<string, any[]> = new Map();

function mockDb() {
  return {
    execute: jest.fn(async (query: string, params?: any[]) => {
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
        const values = query.match(/VALUES\s*\((.+)\)/s);
        if (values) {
          const idMatch = query.match(/id\s*TEXT\s*PRIMARY\s*KEY/);
          // Extract id from params (first param is always id)
          const id = params?.[0];
          if (id && !_inMemoryStore.has(id)) {
            _inMemoryStore.set(id, params);
          } else if (id) {
            _inMemoryStore.set(id, params);
          }
        }
        return { rows: [], rowsAffected: 1, insertId: 1 };
      }

      // Handle SELECT queries
      if (query.startsWith('SELECT')) {
        const fromMatch = query.match(/FROM\s+reminders/);
        if (!fromMatch) return { rows: [], rowsAffected: 0 };

        const whereMatch = query.match(/WHERE\s+(.+)$/);
        let filtered: any[] = Array.from(_inMemoryStore.values());

        if (whereMatch) {
          const whereClause = whereMatch[1];
          // Handle status filter
          const statusMatch = whereClause.match(/status\s*=\s*\?/);
          if (statusMatch && params?.[0]) {
            // params[0] is the status value, but we stored params as arrays
            // We need to match by checking if the stored params contain this status
            const statusParam = params[0];
            filtered = filtered.filter(p => {
              // The status is at index 8 in our stored params (0=id, 1=title, ..., 8=status)
              return p[8] === statusParam;
            });
          }
          // Handle WHERE id = ?
          const idMatch2 = whereClause.match(/id\s*=\s*\?/);
          if (idMatch2 && params?.[0]) {
            filtered = filtered.filter(p => p[0] === params[0]);
          }
          // Handle WHERE status NOT IN (...)
          const notInMatch = whereClause.match(/NOT IN\s*\((.+)\)/);
          if (notInMatch) {
            const excludedStatuses = notInMatch[1].split(',').map((s: string) => s.trim().replace(/'/g, ''));
            filtered = filtered.filter(p => {
              const status = p[8];
              return !excludedStatuses.includes(status);
            });
          }
        }

        const rows = filtered.map((p, i) => ({
          id: p[0], title: p[1], description: p[2] || null,
          latitude: p[3], longitude: p[4], locationName: p[5] || null,
          radiusMeters: p[6], locationSource: p[7], status: p[8],
          createdAt: p[9], updatedAt: p[10], triggeredAt: p[11] || null,
          completedAt: p[12] || null,
          notificationSoundEnabled: p[13], notificationVibrationEnabled: p[14],
        }));

        return { rows, rowsAffected: 0 };
      }

      // Handle DELETE FROM reminders
      if (query.startsWith('DELETE FROM')) {
        const idMatch = query.match(/id\s*=\s*\?/);
        if (idMatch && params?.[0]) {
          const existed = _inMemoryStore.has(params[0]);
          _inMemoryStore.delete(params[0]);
          return { rows: [], rowsAffected: existed ? 1 : 0 };
        }
        _inMemoryStore.clear();
        return { rows: [], rowsAffected: 0 };
      }

      return { rows: [], rowsAffected: 0 };
    }),
    transaction: jest.fn(async (fn: (tx: any) => Promise<void>) => {
      await fn({
        execute: jest.fn(async (query: string, params?: any[]) => {
          // Same logic as db.execute but for transaction context
          if (query.startsWith('PRAGMA user_version')) {
            return { rows: [{ user_version: _dbExists ? 1 : 0 }], rowsAffected: 0 };
          }
          if (query.includes('CREATE TABLE')) {
            _dbExists = true;
            return { rows: [], rowsAffected: 0 };
          }
          if (query.includes('INSERT OR REPLACE')) {
            const id = params?.[0];
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

export const open = jest.fn(mockDb);
export const openAsync = jest.fn(mockDb);
export const QueryResult = {};

// Reset mock state between tests
beforeEach(() => {
  _dbExists = false;
  _inMemoryStore.clear();
});
