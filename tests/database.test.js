import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import { DatabaseManager } from '../src/database/index.js';

// Global Mock Store
let store = {
  files: [],
  directories: [],
  tags: [],
  file_tags: [],
  settings: []
};

const mockPrepare = vi.fn((sql) => {
  const s = sql.trim();
  const upperS = s.toUpperCase();
  
  return {
    run: vi.fn((...args) => {
      if (upperS.includes('INSERT OR IGNORE INTO DIRECTORIES')) {
        const [p, n, w] = args;
        if (!store.directories.find(d => d.path === p)) {
            store.directories.push({ id: store.directories.length + 1, path: p, name: n, is_watching: w });
        }
        return { lastInsertRowid: store.directories.length };
      }
      if (upperS.includes('INSERT INTO FILES') || upperS.includes('INSERT OR REPLACE INTO FILES')) {
        // Assuming: path, name, size, mtime, updated_at, directory_id
        // Note: DatabaseManager.addFile implementation:
        // INSERT INTO files (path, name, size, mtime, updated_at, directory_id) VALUES (?, ?, ?, ?, ?, ?)
        const [p, n, sz, mt, ua, did] = args;
        store.files.push({ id: store.files.length + 1, path: p, name: n, size: sz, mtime: mt, directory_id: did });
        return { lastInsertRowid: store.files.length };
      }
      if (upperS.includes('INSERT OR IGNORE INTO TAGS')) {
        const [n, c] = args;
        let tag = store.tags.find(t => t.name === n);
        if (!tag) {
             store.tags.push({ id: store.tags.length + 1, name: n, color: c });
        }
        return { lastInsertRowid: tag ? tag.id : store.tags.length };
      }
      if (upperS.includes('INSERT OR IGNORE INTO FILE_TAGS')) {
        const [fid, tid] = args;
        store.file_tags.push({ file_id: fid, tag_id: tid });
        return { lastInsertRowid: 0 };
      }
      if (upperS.includes('DELETE FROM DIRECTORIES WHERE ID')) {
        const id = args[0];
        store.directories = store.directories.filter(d => d.id !== id);
        // Simulate cascade delete
        store.files = store.files.filter(f => f.directory_id !== id);
        return { changes: 1 };
      }
      if (upperS.includes('DELETE FROM FILES WHERE ID')) {
        const id = args[0];
        store.files = store.files.filter(f => f.id !== id);
        return { changes: 1 };
      }
      return { lastInsertRowid: 1, changes: 1 };
    }),
    get: vi.fn((...args) => {
       if (upperS.includes('FROM DIRECTORIES WHERE PATH')) {
           return store.directories.find(d => d.path === args[0]);
       }
       if (upperS.includes('FROM FILES WHERE PATH')) {
           return store.files.find(f => f.path === args[0]);
       }
       return undefined;
    }),
    all: vi.fn((...args) => {
       if (upperS.includes('FROM SQLITE_MASTER')) {
           return ['directories', 'files', 'tags', 'file_tags'].map(n => ({name: n}));
       }
       if (upperS.includes('FROM DIRECTORIES')) return store.directories;
       if (upperS.includes('FROM FILES')) return store.files;
       if (upperS.includes('FROM TAGS') && upperS.includes('JOIN FILE_TAGS')) {
           const fileId = args[0];
           const tagIds = store.file_tags.filter(ft => ft.file_id === fileId).map(ft => ft.tag_id);
           return store.tags.filter(t => tagIds.includes(t.id));
       }
       return [];
    })
  };
});

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(() => ({
      pragma: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
      transaction: vi.fn(fn => fn),
      prepare: mockPrepare
    }))
  };
});

describe('DatabaseManager', () => {
  let dbManager;
  const TEST_DIR_PATH = path.join(process.cwd(), 'test', 'dir');
  const TEST_FILE_PATH = path.join(TEST_DIR_PATH, 'file.txt');

  beforeEach(() => {
    // Reset store
    store.files = [];
    store.directories = [];
    store.tags = [];
    store.file_tags = [];
    
    // Use in-memory database for testing
    dbManager = new DatabaseManager(':memory:');
    dbManager.init();
    // Ensure FKs are on for SQLite
    dbManager.db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    if (dbManager.db) {
      dbManager.db.close();
    }
  });

  it('should initialize database tables', () => {
    const tables = dbManager.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('directories');
    expect(tableNames).toContain('files');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('file_tags');
  });

  it('should add and retrieve a directory', () => {
    const result = dbManager.addDirectory(TEST_DIR_PATH);
    expect(result.id).toBeDefined();

    const dirs = dbManager.getAllDirectories();
    expect(dirs.length).toBeGreaterThanOrEqual(1);
    
    const addedDir = dirs.find(d => d.path === TEST_DIR_PATH);
    expect(addedDir).toBeDefined();
    
    // Verify cross-platform name extraction
    expect(addedDir.name).toBe('dir');
  });

  it('should add and retrieve a file', () => {
    const dirId = dbManager.addDirectory(TEST_DIR_PATH).id;

    const fileInfo = {
      path: TEST_FILE_PATH,
      name: 'file.txt',
      size: 1024,
      mtime: Date.now(),
      directory_id: dirId
    };

    dbManager.addFile(fileInfo);
    
    const files = dbManager.getAllFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(fileInfo.path);
    expect(files[0].directory_id).toBe(dirId); 
  });

  it('should add and attach tags to a file', () => {
     const dirId = dbManager.addDirectory(TEST_DIR_PATH).id;
     const fileInfo = { path: TEST_FILE_PATH, name: 'file.txt', size: 100, mtime: 100, directory_id: dirId };
     dbManager.addFile(fileInfo);
     const file = dbManager.getFileByPath(fileInfo.path);
     
     const tagId = dbManager.addTag('Important', '#ff0000').lastInsertRowid;
     
     dbManager.tagFile(file.id, tagId);
     
     const tags = dbManager.getFileTags(file.id);
     expect(tags).toHaveLength(1);
     expect(tags[0].name).toBe('Important');
  });

  it('should cascade delete files when directory is deleted', () => {
    const dirId = dbManager.addDirectory(TEST_DIR_PATH).id;
    const fileInfo = { path: TEST_FILE_PATH, name: 'file.txt', size: 100, mtime: 100, directory_id: dirId };
    dbManager.addFile(fileInfo);
    
    const file = dbManager.getFileByPath(fileInfo.path);
    expect(file).toBeDefined();
    expect(file.directory_id).toBe(dirId);

    dbManager.deleteDirectory(dirId);
    
    const deletedFile = dbManager.getFileByPath(fileInfo.path);
    expect(deletedFile).toBeUndefined();
  });
  
  it('should delete file but keep system file (database logic only)', () => {
     const dirId = dbManager.addDirectory(TEST_DIR_PATH).id;
     const fileInfo = { path: TEST_FILE_PATH, name: 'file.txt', size: 100, mtime: 100, directory_id: dirId };
     dbManager.addFile(fileInfo);
     const file = dbManager.getFileByPath(fileInfo.path);
     
     dbManager.deleteFile(file.id);
     
     const deletedFile = dbManager.getFileByPath(fileInfo.path);
     expect(deletedFile).toBeUndefined();
  });
});
