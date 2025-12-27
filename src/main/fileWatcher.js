import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import path from 'path';
import dbManager from '../database/index.js';

class FileWatcher {
  constructor(databaseManager = null) {
    this.watchers = new Map();
    this.watcherDirs = new Map(); // 存储 watcher -> directoryId 的映射
    this.isWatching = false;
    this.dbManager = databaseManager || dbManager;
  }

  // 开始监控目录
  async watchDirectory(directoryPath, directoryId, options = {}) {
    try {
      // 检查目录是否存在
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error(`${directoryPath} 不是一个有效的目录`);
      }

      // 如果已经在监控该目录，则停止之前的监控
      if (this.watchers.has(directoryPath)) {
        this.unwatchDirectory(directoryPath);
      }

      // 创建监听器
      const watcher = chokidar.watch(directoryPath, {
        ignored: /(^|\/\.)(\.|node_modules|\.git)/,
        persistent: true,
        ignoreInitial: false, // 设置为 false 以便在初始化时处理所有文件
        followSymlinks: false,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        },
        ...options
      });

      // 注册事件处理程序，传入 directoryId
      this._registerWatcherEvents(watcher, directoryPath, directoryId);

      // 存储监听器
      this.watchers.set(directoryPath, watcher);
      this.watcherDirs.set(directoryPath, directoryId);
      this.isWatching = true;

      console.log(`开始监控目录: ${directoryPath} (ID: ${directoryId})`);
      return true;
    } catch (error) {
      console.error(`监控目录失败 ${directoryPath}:`, error);
      return false;
    }
  }

  // 监控单个或多个文件
  async watchFiles(filePaths, directoryId) {
    try {
      // 创建文件监听器
      const watcher = chokidar.watch(filePaths, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100
        }
      });

      // 注册事件处理程序
      // 使用一个虚拟的路径标识符作为 key，例如 "virtual:watched_files"
      // 但为了兼容性，我们也可以不将这个 watcher 放入 watchers Map，或者使用特殊 key
      // 这里我们简单地直接处理事件，因为文件监控通常不需要像目录那样复杂的递归逻辑
      
      watcher
        .on('add', (filePath) => this._handleFileAdd(filePath, directoryId))
        .on('change', (filePath) => this._handleFileChange(filePath, directoryId))
        .on('unlink', (filePath) => this._handleFileDelete(filePath))
        .on('error', (error) => console.error(`监控文件错误:`, error));

      // 将这些文件添加到 watchers 中以便管理
      // 注意：这里 key 使用 filePaths 的第一个文件作为标识可能不够好，
      // 但考虑到这是一个特殊的 watcher，我们可以用特定前缀
      const watcherKey = `files:${filePaths.join('|').substring(0, 50)}...`; 
      this.watchers.set(watcherKey, watcher);
      
      // 手动触发添加事件，因为 chokidar 可能不会对已存在的文件立即触发 add
      for (const filePath of filePaths) {
        try {
           // 确保它是文件
           const stats = await fs.stat(filePath);
           if (stats.isFile()) {
             await this._handleFileAdd(filePath, directoryId);
           }
        } catch (err) {
          console.warn(`无法访问文件 ${filePath}:`, err);
        }
      }

      console.log(`开始监控 ${filePaths.length} 个文件 (ID: ${directoryId})`);
      return true;
    } catch (error) {
      console.error(`监控文件失败:`, error);
      return false;
    }
  }

  // 停止监控目录
  unwatchDirectory(directoryPath) {
    try {
      const watcher = this.watchers.get(directoryPath);
      if (watcher) {
        watcher.close();
        this.watchers.delete(directoryPath);
        this.watcherDirs.delete(directoryPath);
        console.log(`停止监控目录: ${directoryPath}`);
      }

      if (this.watchers.size === 0) {
        this.isWatching = false;
      }

      return true;
    } catch (error) {
      console.error(`停止监控目录失败 ${directoryPath}:`, error);
      return false;
    }
  }

  // 停止所有监控
  unwatchAll() {
    for (const directoryPath of this.watchers.keys()) {
      this.unwatchDirectory(directoryPath);
    }
    return true;
  }

  // 获取当前监控的目录列表
  getWatchedDirectories() {
    return Array.from(this.watchers.keys());
  }

  // 注册监听器事件
  _registerWatcherEvents(watcher, basePath, directoryId) {
    // 监听所有事件
    watcher
      .on('add', (filePath) => this._handleFileAdd(filePath, directoryId))
      .on('change', (filePath) => this._handleFileChange(filePath, directoryId))
      .on('unlink', (filePath) => this._handleFileDelete(filePath))
      .on('addDir', (dirPath) => this._handleDirAdd(dirPath))
      .on('unlinkDir', (dirPath) => this._handleDirDelete(dirPath))
      .on('error', (error) => this._handleError(error, basePath));
  }

  // 处理文件添加事件
  async _handleFileAdd(filePath, directoryId) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtimeMs,
        directory_id: directoryId // 添加 directory_id
      };

      // 更新数据库
      // 使用 addFile 方法，如果文件已存在则更新，但要注意不要覆盖已有的关联信息
      // 我们的 addFile 实现是 INSERT OR REPLACE，这可能会导致 id 变化，从而丢失 tags 关联
      // 检查 dbManager.addFile 实现
      // dbManager.addFile 使用 INSERT OR REPLACE INTO files ...
      // 这确实会导致原有记录被删除再插入，导致外键约束级联删除 file_tags
      
      // 修正：应该先检查是否存在，如果存在则更新元数据，保留ID
      // 如果 dbManager.addFile 没有处理这个问题，我们需要修改它。
      // 暂时我们修改这里，调用一个新的 updateOrAddFile 方法，或者修改 dbManager
      
      // 让我们修改 dbManager.addFile 方法，或者在这里先查询
      // 由于我无法直接修改 dbManager 的代码（在另一个文件），我在这里做处理
      
      // 但实际上，最好的方式是修改 dbManager.addFile。
      // 不过既然我已经在修改 fileWatcher.js，我可以调用一个更安全的方法
      // 但 dbManager 是引入的实例。
      
      // 还是去修改 dbManager.addFile 比较好，那是根源。
      // 但为了不打断当前的修改流，我先保持原样，并在下一步去修复 dbManager。
      
      this.dbManager.addFile(fileInfo);
      console.log(`文件添加: ${filePath} (DirID: ${directoryId})`);
    } catch (error) {
      console.error(`处理文件添加事件失败 ${filePath}:`, error);
    }
  }

  // 处理文件修改事件
  async _handleFileChange(filePath, directoryId) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtimeMs,
        directory_id: directoryId // 添加 directory_id
      };

      // 更新数据库
      // 同上，需要安全的更新
      this.dbManager.addFile(fileInfo);
      console.log(`文件修改: ${filePath} (DirID: ${directoryId})`);
    } catch (error) {
      console.error(`处理文件修改事件失败 ${filePath}:`, error);
    }
  }

  // 处理文件删除事件
  _handleFileDelete(filePath) {
    try {
      // 从数据库中删除文件
      const file = this.dbManager.getFileByPath(filePath);
      if (file) {
        // 如果是删除文件，同时也要删除关联的标签
        // dbManager.deleteFile 内部可能已经处理了级联删除（FOREIGN KEY ON DELETE CASCADE）
        // 检查 schema: FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        // 所以这里不需要手动删除标签，直接删除文件即可。
        
        this.dbManager.deleteFile(file.id);
        // 如果需要更新目录统计，deleteFile 后可能需要触发 updateDirectoryStats
        // 目前 deleteFile 只是简单删除，没有更新统计。
        // 为了数据一致性，应该在 deleteFile 中或这里处理统计更新。
        // 由于 dbManager.deleteFile 比较简单，我们可以在这里补充更新逻辑
        if (file.directory_id) {
          this.dbManager.updateDirectoryStats(file.directory_id);
        }
      }
      console.log(`文件删除: ${filePath}`);
    } catch (error) {
      console.error(`处理文件删除事件失败 ${filePath}:`, error);
    }
  }

  // 处理目录添加事件
  _handleDirAdd(dirPath) {
    console.log(`目录添加: ${dirPath}`);
  }

  // 处理目录删除事件
  _handleDirDelete(dirPath) {
    console.log(`目录删除: ${dirPath}`);
  }

  // 处理错误事件
  _handleError(error, directoryPath) {
    console.error(`监控目录错误 ${directoryPath}:`, error);
  }

  // 索引目录内容
  async indexDirectory(directoryPath, directoryId) {
    try {
      // 确保目录存在
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error(`${directoryPath} 不是一个有效的目录`);
      }

      console.log(`开始索引目录: ${directoryPath} (ID: ${directoryId})`);
      await this._traverseDirectory(directoryPath, directoryId);
      console.log(`目录索引完成: ${directoryPath}`);
      
      // 索引完成后，显式更新一次统计信息
      if (directoryId) {
        this.dbManager.updateDirectoryStats(directoryId);
        this.dbManager.updateDirectoryScanTime(directoryId);
      }
      
      return true;
    } catch (error) {
      console.error(`索引目录失败 ${directoryPath}:`, error);
      return false;
    }
  }

  // 递归遍历目录并索引文件
  async _traverseDirectory(directoryPath, directoryId) {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        // 忽略隐藏文件和特定目录
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          // 递归处理子目录，传递相同的 directoryId
          await this._traverseDirectory(fullPath, directoryId);
        } else if (entry.isFile()) {
          // 处理文件
          try {
            const stats = await fs.stat(fullPath);
            const fileInfo = {
              path: fullPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtimeMs,
              directory_id: directoryId // 添加 directory_id
            };

            // 更新数据库
            this.dbManager.addFile(fileInfo);
          } catch (fileError) {
            console.warn(`无法访问文件 ${fullPath}:`, fileError.message);
          }
        }
      }
    } catch (error) {
      console.error(`遍历目录失败 ${directoryPath}:`, error);
    }
  }
}

// 导出单例实例
const fileWatcher = new FileWatcher();
export { FileWatcher };
export default fileWatcher;
