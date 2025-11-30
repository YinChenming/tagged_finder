const { contextBridge, ipcRenderer } = require('electron');

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 目录选择和索引相关
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  indexDirectory: (directoryPath) => ipcRenderer.invoke('index-directory', directoryPath),
  watchDirectory: (directoryPath) => ipcRenderer.invoke('watch-directory', directoryPath),
  unwatchDirectory: (directoryPath) => ipcRenderer.invoke('unwatch-directory', directoryPath),
  getWatchedDirectories: () => ipcRenderer.invoke('get-watched-directories'),
  addDirectory: (directoryPath) => ipcRenderer.invoke('add-directory', directoryPath),
  toggleDirectory: (directoryId) => ipcRenderer.invoke('toggle-directory', directoryId),
  scanDirectory: (directoryId) => ipcRenderer.invoke('scan-directory', directoryId),

  // 文件相关操作
  getAllFiles: () => ipcRenderer.invoke('get-all-files'),
  getFilesCount: (tagId) => ipcRenderer.invoke('get-files-count', tagId),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getFileTags: (fileId) => ipcRenderer.invoke('get-file-tags', fileId),

  // 标签相关操作
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  addTag: (tagInfo) => ipcRenderer.invoke('add-tag', tagInfo),
  updateTag: (tagInfo) => ipcRenderer.invoke('update-tag', tagInfo),
  deleteTag: (tagId) => ipcRenderer.invoke('delete-tag', tagId),
  tagFile: (fileTagInfo) => ipcRenderer.invoke('tag-file', fileTagInfo),
  getFilesByTag: (tagId) => ipcRenderer.invoke('get-files-by-tag', tagId),
  isFileTagged: (fileTagInfo) => ipcRenderer.invoke('is-file-tagged', fileTagInfo),

  // 设置相关操作
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  // 系统信息相关
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

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
