import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 确保数据库目录存在
const dbDir = path.join(process.cwd(), 'src/database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库文件路径
const dbPath = path.join(dbDir, 'tagged_finder.db');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  // 初始化数据库
  init() {
    try {
      // 创建数据库连接
      this.db = new Database(dbPath);

      // 创建必要的表
      this.createTables();

      console.log('数据库初始化成功');
      return this.db;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return null;
    }
  }

  // 创建表
  createTables() {
    try {
      // 创建文件表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          size INTEGER DEFAULT 0,
          mtime INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
          updated_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
          directory_id INTEGER,
          FOREIGN KEY (directory_id) REFERENCES directories(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
        CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
        CREATE INDEX IF NOT EXISTS idx_files_directory ON files(directory_id);
      `);

      // 创建标签表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          color TEXT DEFAULT '#4CAF50',
          created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
        );

        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
      `);

      // 创建文件标签关联表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS file_tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
          UNIQUE(file_id, tag_id),
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
        CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);
      `);

      // 创建目录表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS directories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          is_watching BOOLEAN DEFAULT 1,
          files_count INTEGER DEFAULT 0,
          total_size INTEGER DEFAULT 0,
          last_scan INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
        );

        CREATE INDEX IF NOT EXISTS idx_directories_path ON directories(path);
      `);

      // 创建设置表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      `);

      // 添加默认设置
      this.addDefaultSettings();
    } catch (error) {
      console.error('创建表失败:', error);
      throw error;
    }
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('数据库连接已关闭');
    }
  }

  // 获取数据库实例
  getInstance() {
    if (!this.db) {
      this.init();
    }
    return this.db;
  }

  // 添加默认设置
  addDefaultSettings() {
    try {
      const settings = {
        'auto_start_monitoring': 'true',
        'auto_scan_new_files': 'true',
        'monitoring_interval': '60',
        'index_content': 'false',
        'content_index_depth': 'light',
        'ignore_patterns': '*.tmp\n.DS_Store\nThumbs.db\n*.bak\nnode_modules/\n.git/\n__pycache__/'
      };

      for (const [key, value] of Object.entries(settings)) {
        this.db.prepare(
          'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
        ).run(key, value);
      }
    } catch (error) {
      console.error('添加默认设置失败:', error);
    }
  }

  // 添加文件
  addFile(file) {
    try {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO files (path, name, size, mtime, updated_at, directory_id) VALUES (?, ?, ?, ?, ?, ?)'
      );

      const result = stmt.run(file.path, file.name, file.size || 0, file.mtime || 0, Date.now() / 1000, file.directory_id || null);

      // 更新目录的文件数量和总大小
      if (file.directory_id) {
        this.updateDirectoryStats(file.directory_id);
      }

      return result;
    } catch (error) {
      console.error('添加文件失败:', error);
      return null;
    }
  }

  // 根据路径获取文件
  getFileByPath(path) {
    const stmt = this.db.prepare('SELECT * FROM files WHERE path = ?');
    return stmt.get(path);
  }

  // 更新目录统计信息
  updateDirectoryStats(directoryId) {
    try {
      // 计算文件数量
      const filesCount = this.db.prepare(
        'SELECT COUNT(*) as count FROM files WHERE directory_id = ?'
      ).get(directoryId).count;

      // 计算总大小
      const totalSize = this.db.prepare(
        'SELECT SUM(size) as size FROM files WHERE directory_id = ?'
      ).get(directoryId).size || 0;

      // 更新目录信息
      this.db.prepare(
        'UPDATE directories SET files_count = ?, total_size = ? WHERE id = ?'
      ).run(filesCount, totalSize, directoryId);
    } catch (error) {
      console.error('更新目录统计信息失败:', error);
    }
  }

  // 获取所有文件
  getAllFiles() {
    const stmt = this.db.prepare('SELECT * FROM files ORDER BY name');
    return stmt.all();
  }

  // 删除文件
  deleteFile(fileId) {
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ?');
    return stmt.run(fileId);
  }

  // 标签相关操作
  addTag(name, color = '#007AFF') {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)'
    );
    return stmt.run(name, color);
  }

  // 获取所有标签
  getAllTags() {
    const stmt = this.db.prepare('SELECT * FROM tags ORDER BY name');
    return stmt.all();
  }

  // 删除标签
  deleteTag(tagId) {
    const stmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
    return stmt.run(tagId);
  }

  // 文件标签关联操作
  tagFile(fileId, tagId) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)'
    );
    return stmt.run(fileId, tagId);
  }

  // 取消文件标签关联
  untagFile(fileId, tagId) {
    const stmt = this.db.prepare(
      'DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?'
    );
    return stmt.run(fileId, tagId);
  }

  // 根据标签查找文件
  getFilesByTag(tagId) {
    const stmt = this.db.prepare(`
      SELECT f.* FROM files f
      JOIN file_tags ft ON f.id = ft.file_id
      WHERE ft.tag_id = ?
      ORDER BY f.name
    `);
    return stmt.all(tagId);
  }

  // 获取文件的所有标签
  getFileTags(fileId) {
    const stmt = this.db.prepare(`
      SELECT t.* FROM tags t
      JOIN file_tags ft ON t.id = ft.tag_id
      WHERE ft.file_id = ?
      ORDER BY t.name
    `);
    return stmt.all(fileId);
  }

  // 更新目录的最后扫描时间
  updateDirectoryScanTime(directoryId) {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      this.db.prepare(
        'UPDATE directories SET last_scan = ? WHERE id = ?'
      ).run(currentTime, directoryId);
    } catch (error) {
      console.error('更新目录扫描时间失败:', error);
    }
  }

  // 清理数据库（删除所有文件和标签，但保留目录和设置）
  clearData() {
    try {
      this.db.transaction(() => {
        this.db.prepare('DELETE FROM file_tags').run();
        this.db.prepare('DELETE FROM tags').run();
        this.db.prepare('DELETE FROM files').run();
        // 更新所有目录的文件计数和总大小
        this.db.prepare('UPDATE directories SET files_count = 0, total_size = 0').run();
      })();
      return true;
    } catch (error) {
      console.error('清理数据库失败:', error);
      return false;
    }
  }

  // 目录相关操作
  // 添加目录
  addDirectory(path, isWatching = true) {
    const name = path.split('/').pop() || path;
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO directories (path, name, is_watching) VALUES (?, ?, ?)'
    );
    const result = stmt.run(path, name, isWatching ? 1 : 0);

    // 获取插入的目录ID
    const getStmt = this.db.prepare('SELECT id FROM directories WHERE path = ?');
    return getStmt.get(path);
  }

  // 获取所有目录
  getAllDirectories() {
    const stmt = this.db.prepare('SELECT * FROM directories ORDER BY created_at DESC');
    return stmt.all();
  }

  // 切换目录监控状态
  toggleDirectoryMonitoring(directoryId) {
    // 首先获取当前状态
    const getStmt = this.db.prepare('SELECT is_watching FROM directories WHERE id = ?');
    const currentState = getStmt.get(directoryId);

    if (currentState) {
      const newState = currentState.is_watching ? 0 : 1;
      const updateStmt = this.db.prepare(
        'UPDATE directories SET is_watching = ? WHERE id = ?'
      );
      return updateStmt.run(newState, directoryId);
    }
    return null;
  }

  // 根据ID获取目录
  getDirectoryById(directoryId) {
    const stmt = this.db.prepare('SELECT * FROM directories WHERE id = ?');
    return stmt.get(directoryId);
  }

  // 获取数据库大小（字节）
  getDatabaseSize(dbPath) {
    try {
      const fs = require('fs');
      const stats = fs.statSync(dbPath);
      return stats.size;
    } catch (error) {
      console.error('获取数据库大小失败:', error);
      return 0;
    }
  }

  // 备份数据库
  backupDatabase(sourcePath, destinationPath) {
    try {
      const fs = require('fs');
      const path = require('path');

      // 确保目标目录存在
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // 关闭数据库连接
      this.db.close();
      // 复制文件
      fs.copyFileSync(sourcePath, destinationPath);
      // 重新打开连接
      this.db = new Database(sourcePath);

      return true;
    } catch (error) {
      console.error('备份数据库失败:', error);
      // 尝试重新打开数据库
      try {
        this.db = new Database(sourcePath);
      } catch (reopenError) {
        console.error('重新打开数据库失败:', reopenError);
      }
      return false;
    }
  }
}

// 导出单例实例
const dbManager = new DatabaseManager();

// 纯ES模块导出
export default dbManager;
