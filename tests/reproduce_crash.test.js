import { describe, it, expect, vi } from 'vitest';
import { DatabaseManager } from '../src/database/index.js';

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      pragma: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockReturnValue({ id: 1 }), // Mock get to return an object with id
        all: vi.fn().mockReturnValue([])
      }),
      exec: vi.fn(),
      close: vi.fn(),
      transaction: vi.fn().mockImplementation((fn) => fn)
    }))
  };
});

describe('DatabaseManager Crash Reproduction', () => {
  it('should auto-initialize and succeed when addDirectory is called without init', () => {
    // Create instance but DO NOT call init() manually
    const dbManager = new DatabaseManager(':memory:');
    
    // This should now succeed because of lazy initialization and our mock
    const result = dbManager.addDirectory('/some/path');
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
