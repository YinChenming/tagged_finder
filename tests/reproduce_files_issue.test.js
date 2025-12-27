import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileWatcher } from '../src/main/fileWatcher.js';

// Mock DatabaseManager
class MockDatabaseManager {
  constructor() {
    this.files = [];
    this.directories = [];
    this.db = { close: vi.fn() };
    this.virtualDirId = null;
  }

  init() { return this.db; }

  getVirtualDirectoryId() {
    return this.virtualDirId;
  }

  ensureVirtualDirectory() {
    if (!this.virtualDirId) {
      this.virtualDirId = 999; // Dummy ID
      this.directories.push({ id: this.virtualDirId, path: 'virtual:watched_files' });
    }
  }

  getDirectoryById(id) {
    return this.directories.find(d => d.id === id);
  }

  addDirectory(path, isWatching) {
    const id = this.directories.length + 1;
    this.directories.push({ id, path, is_watching: isWatching ? 1 : 0 });
    return { id };
  }

  addFile(fileInfo) {
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

  updateDirectoryStats() {}
  updateDirectoryScanTime() {}
}

const TEST_DIR = path.join(process.cwd(), 'tests', 'temp_files_issue');

describe('FileWatcher & Database Integration - Files Issue', () => {
  let dbManager;
  let fileWatcher;

  beforeEach(async () => {
    dbManager = new MockDatabaseManager();
    dbManager.init();
    
    fileWatcher = new FileWatcher(dbManager);

    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (fileWatcher) {
        await fileWatcher.unwatchAll();
    }
    if (fs.existsSync(TEST_DIR)) {
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch (e) {
        console.warn('Cleanup failed:', e);
      }
    }
  });

  it('should ensure virtual directory exists and return ID', () => {
    dbManager.ensureVirtualDirectory();
    const id = dbManager.getVirtualDirectoryId();
    expect(id).not.toBeNull();
    
    const dir = dbManager.getDirectoryById(id);
    expect(dir.path).toBe('virtual:watched_files');
  });

  it('should add individual files to virtual directory', async () => {
    const file1 = path.join(TEST_DIR, 'file1.txt');
    const file2 = path.join(TEST_DIR, 'file2.txt');
    fs.writeFileSync(file1, 'content1');
    fs.writeFileSync(file2, 'content2');

    let virtualDirId = dbManager.getVirtualDirectoryId();
    if (!virtualDirId) {
        dbManager.ensureVirtualDirectory();
        virtualDirId = dbManager.getVirtualDirectoryId();
    }
    expect(virtualDirId).not.toBeNull();

    await fileWatcher.watchFiles([file1, file2], virtualDirId);

    const files = dbManager.getAllFiles();
    expect(files).toHaveLength(2);
    
    const f1 = files.find(f => f.name === 'file1.txt');
    expect(f1).toBeDefined();
    expect(f1.directory_id).toBe(virtualDirId);
  });

  it('should handle addDirectory IPC logic flow', async () => {
     const dirPath = TEST_DIR;
     
     const dbResult = dbManager.addDirectory(dirPath, true);
     expect(dbResult).toBeDefined();
     expect(dbResult.id).toBeDefined();
     const directoryId = dbResult.id;

     await fileWatcher.indexDirectory(dirPath, directoryId);
     await fileWatcher.watchDirectory(dirPath, directoryId);
  });
});
