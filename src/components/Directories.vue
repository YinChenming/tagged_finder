<template>
  <div class="directories-container">
    <h2>目录管理</h2>

    <!-- 添加新目录 -->
    <div class="add-dir-container">
      <input
        type="text"
        v-model="selectedDirPath"
        placeholder="选择要监控的目录..."
        readonly
        class="dir-path-input"
      />
      <button class="browse-btn" @click="openDirectoryPicker">浏览...</button>
      <button class="add-dir-btn" @click="addDirectory">添加目录</button>
    </div>

    <!-- 目录列表 -->
    <div class="directories-list">
      <div v-if="directories.length > 0">
        <div
          v-for="dir in directories"
          :key="dir.id"
          class="dir-card"
        >
          <div class="dir-info">
            <div class="dir-header">
              <h3 class="dir-name">{{ getDirName(dir.path) }}</h3>
              <div class="dir-status" :class="{ active: dir.is_watching }">
                {{ dir.is_watching ? '监控中' : '已停止' }}
              </div>
            </div>
            <p class="dir-path">{{ dir.path }}</p>
            <div class="dir-meta">
              <span>文件数: {{ dir.files_count || 0 }}</span>
              <span>上次索引: {{ formatDate(dir.last_scan) }}</span>
            </div>
          </div>
          <div class="dir-actions">
            <button
              class="toggle-btn"
              @click="toggleDirectory(dir)"
              :class="{ active: dir.is_watching }"
            >
              {{ dir.is_watching ? '停止监控' : '开始监控' }}
            </button>
            <button class="scan-btn" @click="scanDirectory(dir)">重新索引</button>
            <button class="delete-btn" @click="confirmDelete(dir)">删除</button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📁</div>
        <p>暂无监控目录，请添加第一个目录</p>
        <p class="empty-hint">添加目录后，系统将自动扫描并索引其中的所有文件</p>
      </div>
    </div>

    <!-- 目录统计信息 -->
    <div v-if="directories.length > 0" class="stats-container">
      <div class="stat-card">
        <div class="stat-value">{{ directories.length }}</div>
        <div class="stat-label">已添加目录</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ activeDirectoriesCount }}</div>
        <div class="stat-label">正在监控</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalFilesCount }}</div>
        <div class="stat-label">已索引文件</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalSize }}</div>
        <div class="stat-label">总文件大小</div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog">
        <div class="dialog-header">
          <h3>确认删除</h3>
        </div>
        <div class="dialog-content">
          <p>确定要移除目录 "{{ dirToDelete?.path }}" 吗？</p>
          <p class="warning-text">此操作将从索引中删除所有与此目录相关的文件。</p>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="cancelDelete">取消</button>
            <button class="danger-btn" @click="deleteDirectory">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 状态数据
const directories = ref([]);
const selectedDirPath = ref('');
const showDeleteConfirm = ref(false);
const dirToDelete = ref(null);

// 计算属性
const activeDirectoriesCount = computed(() => {
  return directories.value.filter(dir => dir.is_watching).length;
});

const totalFilesCount = computed(() => {
  return directories.value.reduce((sum, dir) => sum + (dir.files_count || 0), 0);
});

const totalSize = computed(() => {
  const size = directories.value.reduce((sum, dir) => sum + (dir.total_size || 0), 0);
  return formatSize(size);
});

// 方法
const loadDirectories = async () => {
  try {
    const response = await window.electronAPI.getWatchedDirectories();
    if (response.success) {
      directories.value = response.directories;
    }
  } catch (error) {
    console.error('加载目录失败:', error);
  }
};

const openDirectoryPicker = async () => {
  try {
    const response = await window.electronAPI.selectDirectory();
    if (response.success) {
      selectedDirPath.value = response.path;
    }
  } catch (error) {
    console.error('选择目录失败:', error);
  }
};

const addDirectory = async () => {
  if (!selectedDirPath.value) {
    alert('请选择一个目录');
    return;
  }

  try {
    // 检查目录是否已存在
    const exists = directories.value.some(dir => dir.path === selectedDirPath.value);
    if (exists) {
      alert('该目录已添加');
      return;
    }

    const response = await window.electronAPI.addDirectory(selectedDirPath.value);
    if (response.success) {
      directories.value.push(response.directory);
      selectedDirPath.value = '';
    }
  } catch (error) {
    console.error('添加目录失败:', error);
  }
};

const toggleDirectory = async (dir) => {
  try {
    const response = await window.electronAPI.toggleDirectory(dir.id);
    if (response.success) {
      const index = directories.value.findIndex(d => d.id === dir.id);
      if (index > -1) {
        directories.value[index].is_watching = !dir.is_watching;
      }
    }
  } catch (error) {
    console.error('切换目录监控状态失败:', error);
  }
};

const scanDirectory = async (dir) => {
  try {
    const response = await window.electronAPI.scanDirectory(dir.id);
    if (response.success) {
      // 显示扫描进度或提示成功
      alert('索引已开始，请稍后刷新页面查看结果');

      // 更新目录信息
      const index = directories.value.findIndex(d => d.id === dir.id);
      if (index > -1) {
        directories.value[index].last_scan = Date.now();
      }
    }
  } catch (error) {
    console.error('扫描目录失败:', error);
  }
};

const confirmDelete = (dir) => {
  dirToDelete.value = dir;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  dirToDelete.value = null;
};

const deleteDirectory = async () => {
  try {
    const response = await window.electronAPI.removeDirectory(dirToDelete.value.id);
    if (response.success) {
      directories.value = directories.value.filter(dir => dir.id !== dirToDelete.value.id);
      cancelDelete();
    }
  } catch (error) {
    console.error('删除目录失败:', error);
  }
};

// 工具函数
const getDirName = (path) => {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '从未';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
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

// 组件挂载时加载目录
onMounted(() => {
  loadDirectories();

  // 监听目录变化事件
  window.electronAPI.onDirectoryStatusChange((event, directoryId, status) => {
    const index = directories.value.findIndex(dir => dir.id === directoryId);
    if (index > -1) {
      directories.value[index].is_watching = status;
    }
  });
});
</script>

<style scoped>
.directories-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

/* 添加新目录 */
.add-dir-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.dir-path-input {
  flex: 1;
  min-width: 250px;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background-color: #f9f9f9;
}

.browse-btn {
  padding: 0.75rem 1.5rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
}

.browse-btn:hover {
  background: #1976D2;
}

.add-dir-btn {
  padding: 0.75rem 1.5rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
}

.add-dir-btn:hover {
  background: #45a049;
}

/* 目录列表 */
.directories-list {
  margin-bottom: 2rem;
}

.dir-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.dir-info {
  flex: 1;
}

.dir-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.dir-name {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.dir-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  color: #666;
  background: #f0f0f0;
}

.dir-status.active {
  color: #4CAF50;
  background: #e8f5e8;
}

.dir-path {
  color: #666;
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
}

.dir-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.9rem;
  color: #999;
}

.dir-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 120px;
}

.toggle-btn, .scan-btn, .delete-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.toggle-btn {
  background: #f5f5f5;
  color: #333;
}

.toggle-btn.active {
  background: #ff9800;
  color: white;
}

.toggle-btn:hover:not(.active) {
  background: #e0e0e0;
}

.toggle-btn.active:hover {
  background: #f57c00;
}

.scan-btn {
  background: #2196F3;
  color: white;
}

.scan-btn:hover {
  background: #1976D2;
}

.delete-btn {
  background: #ff4444;
  color: white;
}

.delete-btn:hover {
  background: #cc0000;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4rem;
  color: #999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.95rem;
  color: #bbb;
}

/* 统计信息 */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #2196F3;
  margin-bottom: 0.5rem;
}

.stat-label {
  display: block;
  color: #666;
  font-size: 0.9rem;
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

.warning-text {
  color: #ff9800;
  font-size: 0.9rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0 1.5rem 1.5rem;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .add-dir-container {
    flex-direction: column;
  }

  .dir-path-input {
    width: 100%;
  }

  .dir-card {
    flex-direction: column;
    gap: 1rem;
  }

  .dir-actions {
    flex-direction: row;
    width: 100%;
  }

  .toggle-btn, .scan-btn, .delete-btn {
    flex: 1;
    text-align: center;
  }

  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-container {
    grid-template-columns: 1fr;
  }

  .dir-actions {
    flex-direction: column;
  }
}
</style>