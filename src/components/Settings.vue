<template>
  <div class="settings-container">
    <h2>应用设置</h2>
    
    <div class="settings-grid">
      <!-- 常规设置 -->
      <div class="settings-card">
        <h3>常规设置</h3>
        
        <div class="setting-item">
          <label class="setting-label">应用启动时自动开始监控</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.autoStartMonitoring" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">启动时自动扫描新文件</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.autoScanNewFiles" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">监控间隔(秒)</label>
          <div class="setting-control">
            <input 
              type="number" 
              v-model.number="settings.monitoringInterval" 
              min="1" 
              max="3600"
              class="number-input"
            />
          </div>
        </div>
      </div>
      
      <!-- 索引设置 -->
      <div class="settings-card">
        <h3>索引设置</h3>
        
        <div class="setting-item">
          <label class="setting-label">索引文件内容</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.indexContent" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">内容索引深度</label>
          <div class="setting-control">
            <select v-model="settings.contentIndexDepth" class="select-input">
              <option value="light">轻量 (仅前几行)</option>
              <option value="medium">中等 (前100行)</option>
              <option value="full">完整 (所有内容)</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">忽略模式</label>
          <div class="setting-control">
            <textarea 
              v-model="settings.ignorePatterns"
              placeholder="每行一个模式，例如：\n*.tmp\n.DS_Store\nnode_modules/"
              class="textarea-input"
            ></textarea>
            <div class="setting-hint">使用glob模式匹配，每行一个</div>
          </div>
        </div>
      </div>
      
      <!-- 数据库设置 -->
      <div class="settings-card">
        <h3>数据库设置</h3>
        
        <div class="setting-item">
          <label class="setting-label">数据库位置</label>
          <div class="setting-control">
            <input 
              type="text" 
              v-model="settings.dbPath" 
              readonly
              class="readonly-input"
            />
            <button class="browse-btn" @click="changeDbPath">更改</button>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">数据库大小</label>
          <div class="setting-control">
            <span class="info-text">{{ databaseSize }}</span>
          </div>
        </div>
        
        <div class="setting-actions">
          <button class="secondary-btn" @click="backupDatabase">备份数据库</button>
          <button class="danger-btn" @click="confirmClearDatabase">清理数据库</button>
        </div>
      </div>
      
      <!-- 关于 -->
      <div class="settings-card">
        <h3>关于应用</h3>
        
        <div class="about-info">
          <div class="app-logo">🏷️</div>
          <h4 class="app-name">Tagged Finder</h4>
          <p class="app-version">版本 {{ appVersion }}</p>
          <p class="app-description">高效的文件索引和标签管理工具</p>
        </div>
        
        <div class="system-info">
          <div class="info-item">
            <span class="info-label">操作系统:</span>
            <span class="info-value">{{ systemInfo.os }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Electron版本:</span>
            <span class="info-value">{{ systemInfo.electron }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Node.js版本:</span>
            <span class="info-value">{{ systemInfo.nodejs }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 保存按钮 -->
    <div class="settings-footer">
      <button class="primary-btn" @click="saveSettings">保存设置</button>
      <button class="secondary-btn" @click="restoreDefaults">恢复默认设置</button>
    </div>
    
    <!-- 清理数据库确认对话框 -->
    <div v-if="showClearDbConfirm" class="dialog-overlay" @click.self="cancelClearDatabase">
      <div class="dialog">
        <div class="dialog-header">
          <h3>确认清理</h3>
        </div>
        <div class="dialog-content">
          <p>清理数据库将删除所有索引和标签信息，但不会影响原始文件。此操作不可撤销，是否继续？</p>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="cancelClearDatabase">取消</button>
            <button class="danger-btn" @click="clearDatabase">确认清理</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 状态数据
const settings = ref({
  autoStartMonitoring: true,
  autoScanNewFiles: true,
  monitoringInterval: 60,
  indexContent: false,
  contentIndexDepth: 'light',
  ignorePatterns: '',
  dbPath: ''
});

const databaseSize = ref('计算中...');
const appVersion = ref('1.0.0');
const systemInfo = ref({
  os: 'Unknown',
  electron: 'Unknown',
  nodejs: 'Unknown'
});
const showClearDbConfirm = ref(false);

// 方法
const loadSettings = async () => {
  try {
    const response = await window.electronAPI.getSettings();
    if (response.success) {
      settings.value = { ...settings.value, ...response.settings };
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

const loadSystemInfo = async () => {
  try {
    // 获取应用版本信息
    const appInfo = await window.electronAPI.getAppInfo();
    if (appInfo.success) {
      appVersion.value = appInfo.version;
      systemInfo.value = {
        os: `${appInfo.platform} (${appInfo.osRelease})`,
        electron: appInfo.electron,
        nodejs: appInfo.node
      };
    }
  } catch (error) {
    console.error('加载系统信息失败:', error);
  }
};

const loadDatabaseInfo = async () => {
  try {
    const response = await window.electronAPI.getDatabaseInfo();
    if (response.success) {
      databaseSize.value = formatSize(response.size);
      settings.value.dbPath = response.path;
    }
  } catch (error) {
    console.error('加载数据库信息失败:', error);
  }
};

const saveSettings = async () => {
  try {
    // 调用新的 update-settings 接口
    // 使用 JSON.parse(JSON.stringify()) 深拷贝以移除 Vue 的响应式代理，
    // 避免 Electron 的 IPC 序列化失败 (An object could not be cloned)
    const plainSettings = JSON.parse(JSON.stringify(settings.value));
    const response = await window.electronAPI.updateSettings(plainSettings);
    if (response.success) {
      alert('设置已保存');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
  }
};

const restoreDefaults = () => {
  if (confirm('确定要恢复默认设置吗？')) {
    settings.value = {
      autoStartMonitoring: true,
      autoScanNewFiles: true,
      monitoringInterval: 60,
      indexContent: false,
      contentIndexDepth: 'light',
      ignorePatterns: '',
      dbPath: settings.value.dbPath
    };
    // 立即保存恢复的默认设置到数据库
    saveSettings();
  }
};

const changeDbPath = async () => {
  try {
    const response = await window.electronAPI.selectDatabaseLocation();
    if (response.success) {
      settings.value.dbPath = response.path;
    }
  } catch (error) {
    console.error('选择数据库位置失败:', error);
  }
};

const backupDatabase = async () => {
  try {
    const response = await window.electronAPI.backupDatabase();
    if (response.success) {
      alert(`数据库已成功备份到: ${response.path}`);
    }
  } catch (error) {
    console.error('备份数据库失败:', error);
  }
};

const confirmClearDatabase = () => {
  showClearDbConfirm.value = true;
};

const cancelClearDatabase = () => {
  showClearDbConfirm.value = false;
};

const clearDatabase = async () => {
  try {
    const response = await window.electronAPI.clearDatabase();
    if (response.success) {
      alert('数据库已清理');
      showClearDbConfirm.value = false;
      await loadDatabaseInfo();
    }
  } catch (error) {
    console.error('清理数据库失败:', error);
  }
};

// 工具函数
const formatSize = (size) => {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let currentSize = size;
  while (currentSize >= 1024 && unitIndex < units.length - 1) {
    currentSize /= 1024;
    unitIndex++;
  }
  return `${currentSize.toFixed(2)} ${units[unitIndex]}`;
};

// 组件挂载时加载数据
onMounted(() => {
  loadSettings();
  loadSystemInfo();
  loadDatabaseInfo();
});
</script>

<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

/* 设置网格 */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* 设置卡片 */
.settings-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.75rem;
}

/* 设置项 */
.setting-item {
  margin-bottom: 1.5rem;
}

.setting-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.setting-control {
  position: relative;
}

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* 输入框 */
.number-input,
.select-input,
.textarea-input,
.readonly-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.number-input:focus,
.select-input:focus,
.textarea-input:focus {
  outline: none;
  border-color: #2196F3;
}

.textarea-input {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.readonly-input {
  background-color: #f9f9f9;
  cursor: not-allowed;
}

.setting-hint {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #999;
}

/* 关于信息 */
.about-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.app-logo {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.app-name {
  margin: 0 0 0.5rem;
  color: #2c3e50;
}

.app-version {
  margin: 0 0 1rem;
  color: #666;
  font-size: 0.9rem;
}

.app-description {
  margin: 0;
  color: #999;
  font-size: 0.9rem;
}

.system-info {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #666;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.info-text {
  color: #2196F3;
  font-weight: 500;
}

/* 按钮 */
.setting-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.browse-btn {
  position: absolute;
  right: 0;
  top: 0;
  padding: 0.75rem 1rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  font-size: 0.9rem;
}

.primary-btn, .secondary-btn, .danger-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.primary-btn {
  background: #2196F3;
  color: white;
}

.primary-btn:hover {
  background: #1976D2;
}

.secondary-btn {
  background: #f5f5f5;
  color: #333;
}

.secondary-btn:hover {
  background: #e0e0e0;
}

.danger-btn {
  background: #ff4444;
  color: white;
}

.danger-btn:hover {
  background: #cc0000;
}

/* 底部操作区 */
.settings-footer {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  padding: 1.5rem 1.5rem 0;
}

.dialog-header h3 {
  margin: 0;
  color: #2c3e50;
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-content p {
  margin-bottom: 1.5rem;
  color: #333;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0 1.5rem 1.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .setting-control {
    position: static;
  }
  
  .browse-btn {
    position: static;
    margin-top: 1rem;
    border-radius: 8px;
    width: 100%;
  }
}
</style>