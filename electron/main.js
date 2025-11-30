import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import path from 'path';
import url from 'url';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ES模块中没有__dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 引入数据库和文件监控模块
import dbManager from '../src/database/index.js';
import fileWatcher from '../src/main/fileWatcher.js';

let mainWindow;

// 初始化应用
async function initializeApp() {
  // 初始化数据库
  try {
    dbManager.init();
    
    // 恢复监控已保存的目录
    const directories = dbManager.getAllDirectories();
    console.log(`找到 ${directories.length} 个已保存的目录，准备恢复监控...`);
    
    for (const dir of directories) {
      if (dir.is_watching) {
        try {
          // 检查是否是虚拟目录
          if (dir.path === 'virtual:watched_files') {
            // 虚拟目录不需要常规的 watchDirectory
            // 实际上我们需要获取该目录下已有的文件并重新建立 watchFiles
            // 但由于当前数据库结构中 files 表记录了 directory_id
            // 我们可以查询出属于该虚拟目录的所有文件，然后重新 watch
            const files = dbManager.db.prepare('SELECT path FROM files WHERE directory_id = ?').all(dir.id);
            if (files.length > 0) {
              const filePaths = files.map(f => f.path);
              await fileWatcher.watchFiles(filePaths, dir.id);
            }
          } else {
            await fileWatcher.watchDirectory(dir.path, dir.id);
          }
          // 触发一次索引以确保数据一致性（修复之前的 potential bugs）
          // chokidar 的 ignoreInitial: false 会处理文件添加，但显式索引可以确保统计信息更新
          // 这里我们依赖 chokidar 的 add 事件来更新数据库和统计信息
        } catch (watchError) {
          console.error(`恢复监控目录失败 ${dir.path}:`, watchError);
        }
      }
    }
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.cjs'),
        // 确保支持拖放功能
        nodeIntegration: false
      },
    // 允许文件拖出应用
    acceptFirstMouse: true
  });

  // 启用文件拖放功能
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // 允许所有权限请求（用于开发环境）
    callback(true);
  });

  // 加载应用的 index.html
  if (process.env.NODE_ENV === 'development') {
    // 修改为加载构建后的静态文件，避免依赖Vite开发服务器
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  // 当 window 被关闭，这个事件会被触发
  mainWindow.on('closed', () => {
    // 取消引用 window 对象
    mainWindow = null;
  });
}

// 注册进程间通信事件处理程序
function registerIpcHandlers() {
  // 处理原生文件拖放
  ipcMain.on('ondragstart', async (event, filePath) => {
    try {
      // 尝试获取文件图标
      const icon = await app.getFileIcon(filePath);
      
      // 使用 startDrag 触发原生 OS 级拖放
      event.sender.startDrag({
        file: filePath,
        icon: icon
      });
    } catch (error) {
      console.error('启动拖放失败:', error);
      // 降级尝试：不带图标
      try {
        event.sender.startDrag({
          file: filePath,
          icon: nativeImage.createEmpty()
        });
      } catch (e) {
        console.error('降级拖放也失败:', e);
      }
    }
  });

  // 选择单个或多个文件
  ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, paths: result.filePaths };
    }
    return { success: false, paths: [] };
  });

  // 添加文件监控（添加到虚拟目录）
  ipcMain.handle('add-watched-files', async (event, filePaths) => {
    try {
      // 获取虚拟目录ID
      let virtualDirId = dbManager.getVirtualDirectoryId();
      
      // 如果不存在，尝试创建
      if (!virtualDirId) {
        dbManager.ensureVirtualDirectory();
        virtualDirId = dbManager.getVirtualDirectoryId();
      }
      
      if (!virtualDirId) {
        throw new Error('无法获取虚拟目录ID');
      }

      // 开始监控文件
      await fileWatcher.watchFiles(filePaths, virtualDirId);
      
      // 更新目录统计信息
      dbManager.updateDirectoryStats(virtualDirId);

      return { success: true, count: filePaths.length };
    } catch (error) {
      console.error('添加监控文件失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 选择要索引的目录
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false, path: null };
  });

  // 添加目录（集成选择、索引和监控）
  ipcMain.handle('add-directory', async (event, directoryPath) => {
    try {
      // 添加到数据库并获取ID
      const dbResult = dbManager.addDirectory(directoryPath, true);
      
      if (!dbResult || !dbResult.id) {
        throw new Error('无法添加目录到数据库');
      }

      const directoryId = dbResult.id;

      // 索引目录，传入 directoryId
      await fileWatcher.indexDirectory(directoryPath, directoryId);
      // 开始监控，传入 directoryId
      await fileWatcher.watchDirectory(directoryPath, directoryId);

      // 获取完整的目录信息
      const directory = dbManager.getDirectoryById(directoryId);

      return {
        success: true,
        directory: {
          id: directory.id,
          path: directory.path,
          name: directory.name,
          is_watching: directory.is_watching,
          files_count: directory.files_count || 0,
          last_scan: directory.last_scan || Math.floor(Date.now() / 1000),
          total_size: directory.total_size || 0
        }
      };
    } catch (error) {
      console.error('添加目录失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 切换目录监控状态
  ipcMain.handle('toggle-directory', async (event, directoryId) => {
    try {
      // 获取目录信息
      const directory = dbManager.getDirectoryById(directoryId);
      if (!directory) {
        return { success: false, error: '目录不存在' };
      }

      // 切换数据库中的监控状态
      dbManager.toggleDirectoryMonitoring(directoryId);

      // 切换实际的文件监控
      if (directory.is_watching) {
        // 如果之前在监控，现在取消监控
        await fileWatcher.unwatchDirectory(directory.path);
      } else {
        // 如果之前未监控，现在开始监控，传入 directoryId
        await fileWatcher.watchDirectory(directory.path, directoryId);
      }

      return { success: true };
    } catch (error) {
      console.error('切换目录监控状态失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 扫描目录IPC处理程序
  ipcMain.handle('scan-directory', async (event, directoryId) => {
    try {
      console.log('Scanning directory:', directoryId);
      
      const directory = dbManager.getDirectoryById(directoryId);
      if (!directory) {
        throw new Error('目录不存在');
      }

      // 调用 fileWatcher 重新索引
      await fileWatcher.indexDirectory(directory.path, directoryId);
      
      // 获取更新后的统计信息
      const updatedDir = dbManager.getDirectoryById(directoryId);
      
      return { 
        success: true, 
        scannedFiles: updatedDir.files_count, 
        elapsedTime: 0 
      };
    } catch (error) {
      console.error('Error scanning directory:', error);
      return { success: false, error: error.message };
    }
  });

  // 索引目录
  ipcMain.handle('index-directory', async (event, directoryPath) => {
    try {
      const success = await fileWatcher.indexDirectory(directoryPath);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 开始监控目录
  ipcMain.handle('watch-directory', async (event, directoryPath) => {
    try {
      const success = await fileWatcher.watchDirectory(directoryPath);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 停止监控目录
  ipcMain.handle('unwatch-directory', (event, directoryPath) => {
    try {
      const success = fileWatcher.unwatchDirectory(directoryPath);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 获取所有监控的目录
  ipcMain.handle('get-watched-directories', () => {
    try {
      const directories = dbManager.getAllDirectories();
      // 过滤掉虚拟目录，使其不显示在前端列表
      const visibleDirectories = directories.filter(dir => dir.path !== 'virtual:watched_files');
      
      return {
        success: true,
        directories: visibleDirectories.map(dir => ({
          id: dir.id,
          path: dir.path,
          name: dir.name,
          is_watching: dir.is_watching,
          files_count: dir.files_count || 0,
          last_scan: dir.last_scan || 0,
          total_size: dir.total_size || 0
        }))
      };
    } catch (error) {
      console.error('获取监控目录失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 文件相关操作
  ipcMain.handle('get-all-files', () => {
    try {
      return { success: true, files: dbManager.getAllFiles() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 标签相关操作
  ipcMain.handle('add-tag', (event, { name, color }) => {
    try {
      dbManager.addTag(name, color);
      // 获取所有标签，查找最近添加的标签
      const allTags = dbManager.getAllTags();
      // 假设最新添加的标签在列表末尾
      const newTag = allTags[allTags.length - 1];
      return { success: true, tag: newTag };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 更新标签
  ipcMain.handle('update-tag', async (event, tagInfo) => {
    try {
      // 只提取需要的字段，避免传递无法序列化的对象
      const { id, name, color } = tagInfo;
      const updatedTag = dbManager.updateTag(id, name, color);
      return { success: true, tag: updatedTag };
    } catch (error) {
      console.error('更新标签失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除标签IPC处理程序
  ipcMain.handle('delete-tag', async (event, tagId) => {
    try {
      console.log('Deleting tag:', tagId);
      dbManager.deleteTag(tagId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting tag:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-all-tags', () => {
    try {
      return { success: true, tags: dbManager.getAllTags() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-files-count', async (event, tagId) => {
    try {
      const count = dbManager.getFilesCount(tagId);
      return { success: true, count };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-file-tags', async (event, fileId) => {
    try {
      const tags = dbManager.getFileTags(fileId);
      return { success: true, tags };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('is-file-tagged', async (event, { fileId, tagId }) => {
    try {
      const isTagged = dbManager.isFileTagged(fileId, tagId);
      return { success: true, isTagged };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tag-file', (event, { fileId, tagId }) => {
    try {
      dbManager.tagFile(fileId, tagId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('untag-file', (event, { fileId, tagId }) => {
    try {
      dbManager.untagFile(fileId, tagId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-files-by-tag', (event, tagId) => {
    try {
      return { success: true, files: dbManager.getFilesByTag(tagId) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 打开文件
  ipcMain.handle('open-file', (event, filePath) => {
    try {
      shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 打开外部链接
  ipcMain.handle('open-external', (event, url) => {
    try {
      shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 获取设置信息
  ipcMain.handle('get-settings', () => {
    try {
      const settings = dbManager.getSettings();
      return { success: true, settings };
    } catch (error) {
      console.error('获取设置失败:', error);
      return { error: error.message };
    }
  });

  // 更新设置信息
  ipcMain.handle('update-settings', (event, settings) => {
    try {
      dbManager.updateSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('更新设置失败:', error);
      return { error: error.message };
    }
  });

  // 获取系统信息
  ipcMain.handle('get-system-info', () => {
    try {
      return {
        platform: os.platform(),
        arch: os.arch(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        cpus: os.cpus().length
      };
    } catch (error) {
      console.error('获取系统信息失败:', error);
      return { error: error.message };
    }
  });

  // 获取应用信息
  ipcMain.handle('get-app-info', () => {
    return {
      success: true,
      version: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform,
      osRelease: os.release()
    };
  });

  // 获取数据库信息
  ipcMain.handle('get-database-info', () => {
    try {
      return {
        success: true,
        fileCount: dbManager.getAllFiles().length,
        tagCount: dbManager.getAllTags().length,
        directoryCount: fileWatcher.getWatchedDirectories().length,
        lastUpdated: new Date().toISOString(),
        size: dbManager.getDatabaseSize(), // 获取真实数据库大小
        path: path.join(process.cwd(), 'src/database/tagged_finder.db') // 返回真实路径
      };
    } catch (error) {
      console.error('获取数据库信息失败:', error);
      return { error: error.message };
    }
  });
}

// 清理资源
function cleanup() {
  // 停止所有文件监控
  fileWatcher.unwatchAll();

  // 关闭数据库连接
  try {
    dbManager.close();
  } catch (error) {
    console.error('关闭数据库连接失败:', error);
  }
}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数
app.whenReady().then(() => {
  // 初始化应用
  initializeApp();

  // 创建窗口
  createWindow();

  // 注册进程间通信处理程序
  registerIpcHandlers();

  // 在 macOS 上，当单机 dock 图标并且没有其他窗口打开时，重新创建一个窗口
  app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 关闭所有窗口时退出应用（Windows & Linux）
app.on('window-all-closed', function() {
  // 清理资源
  cleanup();

  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') app.quit();
});

// 应用退出前清理
app.on('will-quit', function() {
  cleanup();
});

// 进程间通信相关的处理
ipcMain.on('message', (event, arg) => {
  console.log(arg); // 打印从渲染进程接收到的消息
  event.reply('message-reply', '已收到消息'); // 回复渲染进程
});
