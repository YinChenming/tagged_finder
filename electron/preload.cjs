const { contextBridge, ipcRenderer, webUtils } = require('electron');

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 拖放相关API
    getSupportedDragFormats: () => {
      // 返回支持的拖放格式
      return ['text/plain', 'text/uri-list', 'public.file-url'];
    },
    // 获取文件路径 (用于解决 contextIsolation 下 File.path 丢失的问题)
    getPathForFile: (file) => {
      try {
        return webUtils.getPathForFile(file);
      } catch (e) {
        console.error('Failed to get path for file:', e);
        return file.path; // Fallback
      }
    },
    // 配置文件拖放数据
    setupFileDragData: (filePath) => {
      // 返回配置好的拖放数据格式
      return {
        plainText: filePath,
        uriList: `file://${filePath}`,
        fileUrl: `file://${filePath}`
      };
    },
    // 触发原生文件拖拽
    dragFile: (filePaths) => ipcRenderer.send('ondragstart', filePaths),
    // 处理拖放到应用的文件/目录
    handleDroppedPaths: (paths) => ipcRenderer.invoke('handle-dropped-paths', paths),
  // 目录选择和索引相关
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  indexDirectory: (directoryPath) => ipcRenderer.invoke('index-directory', directoryPath),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  unwatchDirectory: (directoryPath) => ipcRenderer.invoke('unwatch-directory', directoryPath),
  removeDirectory: (directoryId) => ipcRenderer.invoke('remove-directory', directoryId),
  getWatchedDirectories: () => ipcRenderer.invoke('get-watched-directories'),
  addDirectory: (directoryPath) => ipcRenderer.invoke('add-directory', directoryPath),
  toggleDirectory: (directoryId) => ipcRenderer.invoke('toggle-directory', directoryId),
  scanDirectory: (directoryId) => ipcRenderer.invoke('scan-directory', directoryId),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  addWatchedFiles: (filePaths) => ipcRenderer.invoke('add-watched-files', filePaths),

  // 文件相关操作
  getAllFiles: () => ipcRenderer.invoke('get-all-files'),
  getFilesCount: (tagId) => ipcRenderer.invoke('get-files-count', tagId),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getFileTags: (fileId) => ipcRenderer.invoke('get-file-tags', fileId),
  deleteFile: (fileId) => ipcRenderer.invoke('delete-file', fileId),

  // 标签相关操作
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  addTag: (tagInfo) => ipcRenderer.invoke('add-tag', tagInfo),
  updateTag: (tagInfo) => ipcRenderer.invoke('update-tag', tagInfo),
  deleteTag: (tagId) => ipcRenderer.invoke('delete-tag', tagId),
  tagFile: (fileTagInfo) => ipcRenderer.invoke('tag-file', fileTagInfo),
  untagFile: (fileTagInfo) => ipcRenderer.invoke('untag-file', fileTagInfo),
  getFilesByTag: (tagId) => ipcRenderer.invoke('get-files-by-tag', tagId),
  isFileTagged: (fileTagInfo) => ipcRenderer.invoke('is-file-tagged', fileTagInfo),

  // 设置相关操作
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  setThemeSource: (themeSource) => ipcRenderer.invoke('set-theme-source', themeSource),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 系统信息相关
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // 数据库信息相关
  getDatabaseInfo: () => ipcRenderer.invoke('get-database-info'),

  // 通用消息通信
  sendMessage: (message) => ipcRenderer.send('message', message),
  onMessageReply: (callback) => ipcRenderer.on('message-reply', (event, ...args) => callback(...args)),

  // 从主进程接收通知
  onDirectoryStatusChange: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('directory-status-changed', listener);
    return () => ipcRenderer.removeListener('directory-status-changed', listener);
  },

  onFileChanged: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('file-changed', listener);
    return () => ipcRenderer.removeListener('file-changed', listener);
  }
});

// 使用CommonJS模块格式，确保Electron预加载脚本能正确加载
