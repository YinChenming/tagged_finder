import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import path from 'path';
import dbManager from '../database/index.js';

class FileWatcher {
  constructor() {
    this.watchers = new Map();
    this.isWatching = false;
  }

  // 开始监控目录
  async watchDirectory(directoryPath, options = {}) {
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

      // 注册事件处理程序
      this._registerWatcherEvents(watcher, directoryPath);

      // 存储监听器
      this.watchers.set(directoryPath, watcher);
      this.isWatching = true;

      console.log(`开始监控目录: ${directoryPath}`);
      return true;
    } catch (error) {
      console.error(`监控目录失败 ${directoryPath}:`, error);
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
  _registerWatcherEvents(watcher, basePath) {
    // 监听所有事件
    watcher
      .on('add', (filePath) => this._handleFileAdd(filePath))
      .on('change', (filePath) => this._handleFileChange(filePath))
      .on('unlink', (filePath) => this._handleFileDelete(filePath))
      .on('addDir', (dirPath) => this._handleDirAdd(dirPath))
      .on('unlinkDir', (dirPath) => this._handleDirDelete(dirPath))
      .on('error', (error) => this._handleError(error, basePath));
  }

  // 处理文件添加事件
  async _handleFileAdd(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtimeMs
      };

      // 更新数据库
      dbManager.addFile(fileInfo);
      console.log(`文件添加: ${filePath}`);
    } catch (error) {
      console.error(`处理文件添加事件失败 ${filePath}:`, error);
    }
  }

  // 处理文件修改事件
  async _handleFileChange(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtimeMs
      };

      // 更新数据库
      dbManager.addFile(fileInfo);
      console.log(`文件修改: ${filePath}`);
    } catch (error) {
      console.error(`处理文件修改事件失败 ${filePath}:`, error);
    }
  }

  // 处理文件删除事件
  _handleFileDelete(filePath) {
    try {
      // 从数据库中删除文件
      const file = dbManager.getFileByPath(filePath);
      if (file) {
        dbManager.deleteFile(file.id);
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
  async indexDirectory(directoryPath) {
    try {
      // 确保目录存在
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error(`${directoryPath} 不是一个有效的目录`);
      }

      console.log(`开始索引目录: ${directoryPath}`);
      await this._traverseDirectory(directoryPath);
      console.log(`目录索引完成: ${directoryPath}`);
      return true;
    } catch (error) {
      console.error(`索引目录失败 ${directoryPath}:`, error);
      return false;
    }
  }

  // 递归遍历目录并索引文件
  async _traverseDirectory(directoryPath) {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          // 递归处理子目录
          await this._traverseDirectory(fullPath);
        } else if (entry.isFile()) {
          // 处理文件
          try {
            const stats = await fs.stat(fullPath);
            const fileInfo = {
              path: fullPath,
              name: entry.name,
              size: stats.size,
              mtime: stats.mtimeMs
            };

            // 更新数据库
            dbManager.addFile(fileInfo);
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
export default fileWatcher;
