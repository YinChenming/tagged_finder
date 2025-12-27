import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileWatcher } from '../src/main/fileWatcher.js';

// Mock DatabaseManager to avoid better-sqlite3 dependency in tests
class MockDatabaseManager {
  constructor() {
    this.files = [];
    this.directories = [];
    this.db = { close: vi.fn() }; // Mock db object
  }

  init() {
    return this.db;
  }

  addDirectory(path) {
    const id = this.directories.length + 1;
    this.directories.push({ id, path });
    return { id };
  }

  addFile(fileInfo) {
    // Check if file exists to simulate REPLACE behavior or update
    const index = this.files.findIndex(f => f.path === fileInfo.path);
    if (index >= 0) {
      this.files[index] = { ...this.files[index], ...fileInfo };
    } else {
      this.files.push({ ...fileInfo, id: this.files.length + 1 });
    }
  }

  getFileByPath(path) {
    return this.files.find(f => f.path === path);
  }

  deleteFile(id) {
    const index = this.files.findIndex(f => f.id === id);
    if (index >= 0) {
      this.files.splice(index, 1);
    }
  }

  getAllFiles() {
    return this.files;
  }

  updateDirectoryStats(dirId) {
    // No-op for mock
  }

  updateDirectoryScanTime(dirId) {
    // No-op for mock
  }
}

// Create a temporary directory for testing
const TEST_DIR = path.join(process.cwd(), 'tests', 'temp_watch_dir');

describe('FileWatcher', () => {
  let dbManager;
  let fileWatcher;

  beforeEach(async () => {
    // Setup Mock DB
    dbManager = new MockDatabaseManager();
    dbManager.init();

    // Setup FileWatcher with test DB
    fileWatcher = new FileWatcher(dbManager);

    // Setup Test Dir
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (fileWatcher) {
      await fileWatcher.unwatchAll();
    }
    
    if (fs.existsSync(TEST_DIR)) {
      // Wait a bit for file handles to be released
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch (e) {
        console.warn('Failed to cleanup test dir:', e);
      }
    }
  });

  it('should index existing files in directory', async () => {
    // Create a file
    const filePath = path.join(TEST_DIR, 'test.txt');
    fs.writeFileSync(filePath, 'hello world');

    // Add directory to DB first
    const dirResult = dbManager.addDirectory(TEST_DIR);
    const dirId = dirResult.id;

    // Index
    await fileWatcher.indexDirectory(TEST_DIR, dirId);

    // Verify DB
    const files = dbManager.getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('test.txt');
  });
  
  it('should detect new file creation when watching', async () => {
    const dirResult = dbManager.addDirectory(TEST_DIR);
    const dirId = dirResult.id;

    await fileWatcher.watchDirectory(TEST_DIR, dirId);

    // Create a new file
    const newFilePath = path.join(TEST_DIR, 'new_file.txt');
    fs.writeFileSync(newFilePath, 'new content');

    // Wait for watcher to pick it up
    await new Promise(resolve => setTimeout(resolve, 1500));

    const files = dbManager.getAllFiles();
    const found = files.find(f => f.name === 'new_file.txt');
    expect(found).toBeDefined();
  });
});
