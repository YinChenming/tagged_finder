<template>
  <div class="settings-container">
    <h2>{{ t('settings.title') }}</h2>
    
    <div class="settings-grid">
      <!-- 常规设置 -->
      <div class="settings-card">
        <h3>{{ t('settings.general.title') }}</h3>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.general.language') }}</label>
          <div class="setting-control">
            <select v-model="settings.language" @change="handleLanguageChange" class="select-input">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">{{ t('settings.general.theme') }}</label>
          <div class="setting-control">
            <select v-model="settings.theme" @change="handleThemeChange" class="select-input">
              <option value="system">{{ t('settings.themes.system') }}</option>
              <option value="light">{{ t('settings.themes.light') }}</option>
              <option value="dark">{{ t('settings.themes.dark') }}</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.general.autoStart') }}</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.autoStartMonitoring" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.general.autoScan') }}</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.autoScanNewFiles" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.general.interval') }}</label>
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
        <h3>{{ t('settings.index.title') }}</h3>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.index.indexContent') }}</label>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="settings.indexContent" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.index.depth') }}</label>
          <div class="setting-control">
            <select v-model="settings.contentIndexDepth" class="select-input">
              <option value="light">{{ t('settings.index.depths.light') }}</option>
              <option value="medium">{{ t('settings.index.depths.medium') }}</option>
              <option value="full">{{ t('settings.index.depths.full') }}</option>
            </select>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.index.ignore') }}</label>
          <div class="setting-control">
            <textarea 
              v-model="settings.ignorePatterns"
              :placeholder="t('settings.index.ignorePlaceholder')"
              class="textarea-input"
            ></textarea>
            <div class="setting-hint">{{ t('settings.index.ignoreHint') }}</div>
          </div>
        </div>
      </div>
      
      <!-- 数据库设置 -->
      <div class="settings-card">
        <h3>{{ t('settings.database.title') }}</h3>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.database.location') }}</label>
          <div class="setting-control">
            <input 
              type="text" 
              v-model="settings.dbPath" 
              readonly
              class="readonly-input"
            />
            <button class="browse-btn" @click="changeDbPath">{{ t('settings.database.change') }}</button>
          </div>
        </div>
        
        <div class="setting-item">
          <label class="setting-label">{{ t('settings.database.size') }}</label>
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
          <p class="app-link">
            <a href="#" @click.prevent="openGithub">GitHub 仓库</a>
          </p>
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
      <button class="primary-btn" @click="handleSaveSettings">保存设置</button>
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
import { useSettings } from '../composables/useSettings';
import { useI18n } from '../composables/useI18n';

const { settings, loadSettings, saveSetting } = useSettings();
const { t, setLocale } = useI18n();

const databaseSize = ref('计算中...');
const appVersion = ref('1.0.0');
const systemInfo = ref({
  os: 'Unknown',
  electron: 'Unknown',
  nodejs: 'Unknown'
});
const showClearDbConfirm = ref(false);

// Handle immediate changes
const handleLanguageChange = () => {
  setLocale(settings.value.language);
};

const handleThemeChange = () => {
  // Apply theme immediately to DOM and Main process
  const theme = settings.value.theme;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
  window.electronAPI.setThemeSource(theme);
};

// Initial Load
onMounted(async () => {
  await loadSettings();
  loadSystemInfo();
  loadDatabaseInfo();
});

const loadSystemInfo = async () => {
  try {
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
      // Sync dbPath if it's different/empty
      if (!settings.value.dbPath && response.path) {
        settings.value.dbPath = response.path;
      }
    }
  } catch (error) {
    console.error('加载数据库信息失败:', error);
  }
};

const handleSaveSettings = async () => {
  try {
    const plainSettings = JSON.parse(JSON.stringify(settings.value));
    const response = await window.electronAPI.updateSettings(plainSettings);
    if (response.success) {
      alert('设置已保存');
    }
  } catch (error) {
    console.error('保存设置失败:', error);
  }
};

const openGithub = async () => {
  await window.electronAPI.openExternal('https://github.com/YinChenming/tagged_finder');
};

const restoreDefaults = () => {
  if (confirm('确定要恢复默认设置吗？')) {
    settings.value = {
      ...settings.value,
      autoStartMonitoring: true,
      autoScanNewFiles: true,
      monitoringInterval: 60,
      indexContent: false,
      contentIndexDepth: 'light',
      ignorePatterns: '',
      language: 'zh-CN',
      theme: 'system'
    };
    handleSaveSettings();
    // Re-apply defaults
    setLocale('zh-CN');
    handleThemeChange();
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
</script>

<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: var(--text-main);
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
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.settings-card h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
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
  color: var(--text-main);
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
  background-color: var(--primary-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--primary-color);
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  background-color: var(--bg-main);
  color: var(--text-main);
}

.number-input:focus,
.select-input:focus,
.textarea-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.textarea-input {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.readonly-input {
  background-color: var(--bg-main);
  opacity: 0.7;
  cursor: not-allowed;
}

.setting-hint {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
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
  color: var(--text-main);
}

.app-version {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.app-description {
  margin: 0 0 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.app-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.app-link a:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

.system-info {
  background-color: var(--bg-main);
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
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-main);
  font-weight: 500;
}

.info-text {
  color: var(--primary-color);
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
  background: var(--primary-color);
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
  background: var(--primary-color);
  color: white;
}

.primary-btn:hover {
  background: var(--primary-hover);
}

.secondary-btn {
  background: var(--bg-main);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.secondary-btn:hover {
  background: var(--border-color);
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
  background: var(--bg-card);
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
  color: var(--text-main);
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-content p {
  margin-bottom: 1.5rem;
  color: var(--text-main);
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
