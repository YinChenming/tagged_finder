<template>
  <div class="files-container">
    <h2>文件管理</h2>
    
    <!-- 搜索和筛选区域 -->
    <div class="search-filter">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery"
          placeholder="搜索文件名..."
          class="search-input"
        />
        <button class="search-btn">🔍</button>
      </div>
      <div class="filter-options">
        <select v-model="sortBy" class="filter-select">
          <option value="name">按名称排序</option>
          <option value="date">按修改日期排序</option>
          <option value="size">按大小排序</option>
        </select>
        <select v-model="fileTypeFilter" class="filter-select">
          <option value="">所有类型</option>
          <option value=".pdf">PDF</option>
          <option value=".docx">Word</option>
          <option value=".xlsx">Excel</option>
          <option value=".jpg">图片</option>
          <option value=".mp4">视频</option>
        </select>
        <button class="refresh-btn" @click="refreshFiles">🔄</button>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <div class="files-list">
      <table class="files-table">
        <thead>
          <tr>
            <th>文件名</th>
            <th>路径</th>
            <th>大小</th>
            <th>修改日期</th>
            <th>标签</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in filteredFiles" :key="file.id" class="file-item">
            <td class="file-name" @click="openFile(file.path)">
              <span class="file-icon">{{ getFileIcon(file.name) }}</span>
              <span class="file-text">{{ file.name }}</span>
            </td>
            <td class="file-path">{{ truncatePath(file.path, 50) }}</td>
            <td class="file-size">{{ formatSize(file.size) }}</td>
            <td class="file-date">{{ formatDate(file.mtime) }}</td>
            <td class="file-tags">
              <span v-for="tag in getFileTags(file.id)" :key="tag.id" class="tag-badge" :style="{ backgroundColor: tag.color }">
                {{ tag.name }}
              </span>
              <button class="add-tag-btn" @click="showAddTagDialog(file.id)">➕</button>
            </td>
            <td class="file-actions">
              <button class="action-btn view" @click="openFile(file.path)">👁️</button>
              <button class="action-btn info" @click="showFileInfo(file)">ℹ️</button>
              <button class="action-btn delete" @click="deleteFile(file.id, file.name)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- 空状态 -->
      <div v-if="filteredFiles.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <p>暂无匹配的文件</p>
        <button class="primary-btn" @click="goToDashboard">去仪表盘添加目录</button>
      </div>
    </div>
    
    <!-- 文件信息对话框 -->
    <div v-if="showInfoDialog" class="dialog-overlay" @click.self="closeInfoDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>文件信息</h3>
          <button class="close-btn" @click="closeInfoDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="info-row">
            <span class="info-label">文件名:</span>
            <span class="info-value">{{ selectedFile.name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">完整路径:</span>
            <span class="info-value">{{ selectedFile.path }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">大小:</span>
            <span class="info-value">{{ formatSize(selectedFile.size) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">修改日期:</span>
            <span class="info-value">{{ formatDate(selectedFile.mtime) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">索引时间:</span>
            <span class="info-value">{{ formatDate(selectedFile.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加标签对话框 -->
    <div v-if="showTagDialog" class="dialog-overlay" @click.self="closeTagDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>添加标签</h3>
          <button class="close-btn" @click="closeTagDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="tag-selection">
            <button 
              v-for="tag in tags" 
              :key="tag.id"
              class="tag-option"
              :class="{ selected: selectedTags.includes(tag.id) }"
              :style="{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent', borderColor: tag.color }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="closeTagDialog">取消</button>
            <button class="primary-btn" @click="applyTags">应用标签</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 状态数据
const files = ref([]);
const tags = ref([]);
const searchQuery = ref('');
const sortBy = ref('name');
const fileTypeFilter = ref('');
const showInfoDialog = ref(false);
const selectedFile = ref({});
const showTagDialog = ref(false);
const currentFileId = ref(null);
const selectedTags = ref([]);

// 计算属性
const filteredFiles = computed(() => {
  let result = [...files.value];
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(file => 
      file.name.toLowerCase().includes(query)
    );
  }
  
  // 文件类型过滤
  if (fileTypeFilter.value) {
    result = result.filter(file => 
      file.name.endsWith(fileTypeFilter.value)
    );
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return b.mtime - a.mtime;
      case 'size':
        return b.size - a.size;
      default:
        return 0;
    }
  });
  
  return result;
});

// 方法
const loadFiles = async () => {
  try {
    const response = await window.electronAPI.getAllFiles();
    if (response.success) {
      files.value = response.files;
    }
  } catch (error) {
    console.error('加载文件失败:', error);
  }
};

const loadTags = async () => {
  try {
    const response = await window.electronAPI.getAllTags();
    if (response.success) {
      tags.value = response.tags;
    }
  } catch (error) {
    console.error('加载标签失败:', error);
  }
};

const getFileTags = (fileId) => {
  // 这里应该从数据库获取文件的标签
  // 目前返回模拟数据
  return [];
};

const openFile = async (filePath) => {
  try {
    const response = await window.electronAPI.openFile(filePath);
    if (!response.success) {
      alert(`无法打开文件: ${response.error}`);
    }
  } catch (error) {
    console.error('打开文件失败:', error);
  }
};

const showFileInfo = (file) => {
  selectedFile.value = { ...file };
  showInfoDialog.value = true;
};

const closeInfoDialog = () => {
  showInfoDialog.value = false;
  selectedFile.value = {};
};

const showAddTagDialog = (fileId) => {
  currentFileId.value = fileId;
  selectedTags.value = [];
  showTagDialog.value = true;
};

const closeTagDialog = () => {
  showTagDialog.value = false;
  currentFileId.value = null;
  selectedTags.value = [];
};

const toggleTag = (tagId) => {
  const index = selectedTags.value.indexOf(tagId);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tagId);
  }
};

const applyTags = async () => {
  try {
    for (const tagId of selectedTags.value) {
      await window.electronAPI.tagFile({ 
        fileId: currentFileId.value, 
        tagId 
      });
    }
    closeTagDialog();
    await loadFiles(); // 重新加载文件以更新标签
  } catch (error) {
    console.error('应用标签失败:', error);
  }
};

const deleteFile = async (fileId, fileName) => {
  if (confirm(`确定要删除文件 "${fileName}" 吗？`)) {
    try {
      // 这里应该调用删除文件的API
      await loadFiles(); // 重新加载文件列表
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  }
};

const refreshFiles = () => {
  loadFiles();
};

const goToDashboard = () => {
  // 切换到仪表盘标签页
  const event = new CustomEvent('switch-tab', { detail: { tab: 'dashboard' } });
  window.dispatchEvent(event);
};

// 工具函数
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    docx: '📝',
    xlsx: '📊',
    pptx: '📑',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎬',
    avi: '🎬',
    mov: '🎬',
    mp3: '🎵',
    wav: '🎵',
    zip: '🗜️',
    rar: '🗜️',
    exe: '⚙️',
    js: '📜',
    py: '🐍',
    html: '🌐',
    css: '🎨',
    json: '📋'
  };
  return icons[ext] || '📄';
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

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

const truncatePath = (path, maxLength) => {
  if (path.length <= maxLength) return path;
  return '...' + path.slice(-(maxLength - 3));
};

// 组件挂载时加载数据
onMounted(() => {
  loadFiles();
  loadTags();
});
</script>

<style scoped>
.files-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

/* 搜索和筛选区域 */
.search-filter {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-box {
  display: flex;
  flex: 1;
  max-width: 400px;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px 0 0 8px;
  font-size: 1rem;
}

.search-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: #2196f3;
  color: white;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
}

.filter-options {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.refresh-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

/* 文件列表 */
.files-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.files-table {
  width: 100%;
  border-collapse: collapse;
}

.files-table th {
  background: #f5f5f5;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}

.file-item {
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
}

.file-item:hover {
  background-color: #f9f9f9;
}

.file-item td {
  padding: 1rem;
}

.file-name {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.file-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.file-text {
  font-weight: 500;
}

.file-path {
  color: #666;
  font-size: 0.9rem;
}

.file-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.tag-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  color: white;
  font-size: 0.85rem;
}

.add-tag-btn {
  padding: 0.25rem 0.5rem;
  border: 1px dashed #ddd;
  background: none;
  border-radius: 4px;
  cursor: pointer;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 4rem;
  color: #999;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
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
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
}

.dialog-content {
  padding: 1.5rem;
  overflow-y: auto;
}

.info-row {
  display: flex;
  margin-bottom: 1rem;
}

.info-label {
  width: 120px;
  font-weight: 600;
  color: #666;
}

.info-value {
  flex: 1;
  word-break: break-all;
}

.tag-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.tag-option {
  padding: 0.5rem 1rem;
  border-radius: 16px;
  border: 2px solid;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-option.selected {
  color: white;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

/* 按钮样式 */
.primary-btn {
  padding: 0.75rem 1.5rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.primary-btn:hover {
  background: #1976d2;
}

.secondary-btn {
  padding: 0.75rem 1.5rem;
  background: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.secondary-btn:hover {
  background: #e0e0e0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-filter {
    flex-direction: column;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .filter-options {
    width: 100%;
    justify-content: space-between;
  }
  
  .files-table {
    display: block;
    overflow-x: auto;
  }
  
  .tag-selection {
    justify-content: center;
  }
}
</style>