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
        <button 
          class="filter-btn" 
          :class="{ active: showTagFilter }"
          @click="showTagFilter = !showTagFilter"
          title="高级标签筛选"
        >
          🏷️ 标签筛选
        </button>
        <button class="refresh-btn" @click="refreshFiles">🔄</button>
      </div>
    </div>

    <!-- 高级标签筛选面板 -->
    <div v-if="showTagFilter" class="tag-filter-panel">
      <div class="filter-row">
        <div class="filter-label-group">
          <span class="filter-label">包含标签:</span>
          <select v-model="includeLogic" class="logic-select">
            <option value="OR">满足任意一个 (OR)</option>
            <option value="AND">同时满足所有 (AND)</option>
          </select>
        </div>
        <div class="tag-select-list">
          <span 
            v-for="tag in tags" 
            :key="'inc-' + tag.id"
            class="tag-chip"
            :class="{ selected: selectedIncludeTags.includes(tag.id) }"
            :style="{ 
              backgroundColor: selectedIncludeTags.includes(tag.id) ? tag.color : '#f5f5f5',
              borderColor: tag.color,
              color: selectedIncludeTags.includes(tag.id) ? '#fff' : '#666'
            }"
            @click="toggleIncludeTag(tag.id)"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-label-group">
          <span class="filter-label">排除标签:</span>
          <span class="logic-label">(NOT)</span>
        </div>
        <div class="tag-select-list">
          <span 
            v-for="tag in tags" 
            :key="'exc-' + tag.id"
            class="tag-chip"
            :class="{ selected: selectedExcludeTags.includes(tag.id) }"
            :style="{ 
              backgroundColor: selectedExcludeTags.includes(tag.id) ? '#ff5252' : '#f5f5f5',
              borderColor: '#ff5252',
              color: selectedExcludeTags.includes(tag.id) ? '#fff' : '#666'
            }"
            @click="toggleExcludeTag(tag.id)"
          >
            {{ tag.name }}
          </span>
        </div>
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
          <tr v-for="file in filteredFiles" :key="file.id" class="file-item" draggable="true" @dragstart="handleDragStart($event, file)">
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

// 高级筛选状态
const showTagFilter = ref(false);
const selectedIncludeTags = ref([]);
const selectedExcludeTags = ref([]);
const includeLogic = ref('OR'); // 'AND' or 'OR'

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

  // 高级标签过滤
  if (selectedIncludeTags.value.length > 0 || selectedExcludeTags.value.length > 0) {
    result = result.filter(file => {
      const fileTags = getFileTags(file.id).map(t => t.id);
      
      // 排除逻辑 (NOT)
      if (selectedExcludeTags.value.length > 0) {
        const hasExcluded = selectedExcludeTags.value.some(tagId => fileTags.includes(tagId));
        if (hasExcluded) return false;
      }

      // 包含逻辑
      if (selectedIncludeTags.value.length > 0) {
        if (includeLogic.value === 'AND') {
          // 必须包含所有选中标签
          const hasAll = selectedIncludeTags.value.every(tagId => fileTags.includes(tagId));
          if (!hasAll) return false;
        } else {
          // 包含任意一个选中标签 (OR)
          const hasAny = selectedIncludeTags.value.some(tagId => fileTags.includes(tagId));
          if (!hasAny) return false;
        }
      }
      
      return true;
    });
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
      await loadAllFileTags(); // 加载文件后更新所有文件标签
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

// 存储文件标签映射的响应式数据
const fileTagsMap = ref({});

// 获取文件的标签
const getFileTags = (fileId) => {
  return fileTagsMap.value[fileId] || [];
};

// 加载单个文件的标签
const loadFileTags = async (fileId) => {
  try {
    const response = await window.electronAPI.getFileTags(fileId);
    if (response.success) {
      fileTagsMap.value[fileId] = response.tags;
    }
  } catch (error) {
    console.error(`加载文件${fileId}的标签失败:`, error);
  }
};

// 加载所有文件的标签
const loadAllFileTags = async () => {
  try {
    const tagsMap = {};
    for (const file of files.value) {
      const response = await window.electronAPI.getFileTags(file.id);
      tagsMap[file.id] = response.success ? response.tags : [];
    }
    fileTagsMap.value = tagsMap;
  } catch (error) {
    console.error('加载所有文件标签失败:', error);
  }
};

const toggleIncludeTag = (id) => {
  // 如果在排除列表中，先移除
  if (selectedExcludeTags.value.includes(id)) {
    selectedExcludeTags.value = selectedExcludeTags.value.filter(t => t !== id);
  }
  
  if (selectedIncludeTags.value.includes(id)) {
    selectedIncludeTags.value = selectedIncludeTags.value.filter(t => t !== id);
  } else {
    selectedIncludeTags.value.push(id);
  }
};

const toggleExcludeTag = (id) => {
  // 如果在包含列表中，先移除
  if (selectedIncludeTags.value.includes(id)) {
    selectedIncludeTags.value = selectedIncludeTags.value.filter(t => t !== id);
  }

  if (selectedExcludeTags.value.includes(id)) {
    selectedExcludeTags.value = selectedExcludeTags.value.filter(t => t !== id);
  } else {
    selectedExcludeTags.value.push(id);
  }
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

const showAddTagDialog = async (fileId) => {
  currentFileId.value = fileId;
  selectedTags.value = [];

  // 加载文件已有的标签，自动选中
  try {
    const response = await window.electronAPI.getFileTags(fileId);
    if (response.success) {
      selectedTags.value = response.tags.map(tag => tag.id);
    }
  } catch (error) {
    console.error(`加载文件${fileId}的标签失败:`, error);
  }

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

// 处理文件拖动开始事件
const handleDragStart = (event, file) => {
  event.preventDefault();
  if (window.electronAPI && window.electronAPI.dragFile) {
    window.electronAPI.dragFile(file.path);
  }
};

// 添加拖放相关的样式调整
const handleDragEnd = (event) => {
  // 移除拖动样式
  event.target.classList.remove('dragging');
};

const applyTags = async () => {
  try {
    const currentFileIdValue = currentFileId.value;
    // 首先获取文件当前已有的标签
    const currentTagsResponse = await window.electronAPI.getFileTags(currentFileIdValue);
    const currentTagIds = currentTagsResponse.success ? currentTagsResponse.tags.map(t => t.id) : [];

    // 找出需要添加的标签（选中但当前没有的）
    const tagsToAdd = selectedTags.value.filter(tagId => !currentTagIds.includes(tagId));

    // 找出需要移除的标签（当前有但未选中的）
    const tagsToRemove = currentTagIds.filter(tagId => !selectedTags.value.includes(tagId));

    // 添加新标签
    for (const tagId of tagsToAdd) {
      await window.electronAPI.tagFile({
        fileId: currentFileIdValue,
        tagId
      });
    }

    // 移除标签
    for (const tagId of tagsToRemove) {
      await window.electronAPI.untagFile({
        fileId: currentFileIdValue,
        tagId
      });
    }

    // 关闭对话框
    closeTagDialog();
    
    // 立即更新当前文件的标签缓存
    // 重新从后端获取最新标签
    const response = await window.electronAPI.getFileTags(currentFileIdValue);
    if (response.success) {
      // 深度更新：直接赋值给新的对象引用，确保 Vue 检测到变化
      // 并且确保 fileTagsMap.value 的引用也发生变化
      const newMap = { ...fileTagsMap.value };
      newMap[currentFileIdValue] = response.tags;
      fileTagsMap.value = newMap;
      
      // 强制更新，虽然通常不需要，但为了保险起见
      // 如果还不行，我们可以使用 triggerRef(fileTagsMap)
    }
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
  // timestamp 可能是秒（Python/Unix常见）或毫秒（JS常见）
  // 如果小于 10000000000，通常是秒，乘以 1000
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  
  // 使用 'zh-CN' 或 'en-GB' 确保 YYYY-MM-DD 格式
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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
  border: 1px solid #e1e8ed;
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background-color: #fff;
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: -2px 0 4px rgba(0, 206, 209, 0.1);
  z-index: 1;
}

.search-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.search-btn:hover {
  background: linear-gradient(135deg, var(--primary-hover), var(--primary-color));
  box-shadow: 0 2px 8px rgba(0, 206, 209, 0.3);
}

.filter-options {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: #fff;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:hover {
  border-color: var(--primary-color);
}

.filter-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #e1e8ed;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.filter-btn:hover, .filter-btn.active {
  background: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-dark);
  box-shadow: 0 2px 8px rgba(0, 206, 209, 0.15);
}

.tag-filter-panel {
  background: #fff;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 206, 209, 0.08);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px dashed #f0f0f0;
}

.filter-row:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.filter-label-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 140px;
}

.filter-label {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.95rem;
}

.logic-select {
  padding: 0.4rem 0.8rem;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-main);
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.logic-select:hover {
  border-color: var(--primary-color);
}

.logic-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  align-self: flex-start;
}

.tag-select-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1;
}

.tag-chip {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.tag-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tag-chip.selected {
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.refresh-btn {
  padding: 0.75rem;
  border: 1px solid #e1e8ed;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.refresh-btn:hover {
  background: var(--bg-main);
  color: var(--primary-color);
  border-color: var(--primary-color);
  transform: rotate(180deg);
}

/* 文件列表 */
.files-list {
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--border-color);
  /* 确保横向内容溢出时显示滚动条 */
  overflow-x: auto;
}

/* 针对文件列表单独设置滚动条样式，确保可见 */
.files-list::-webkit-scrollbar {
  display: block;
  height: 8px; /* 横向滚动条高度 */
  width: 8px;
}

.files-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.files-list::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
}

.files-list::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.files-table {
  width: 100%;
  border-collapse: collapse;
  /* 确保表格最小宽度，触发横向滚动 */
  min-width: 800px; 
}

.files-table th {
  background: #f8fafd;
  padding: 1rem 1.2rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.file-item {
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.file-item:hover {
  background-color: var(--primary-light);
}

.file-item td {
  padding: 1rem 1.2rem;
  color: var(--text-main);
}

.file-name {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.file-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.file-text {
  font-weight: 500;
}

.file-path {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: 'Consolas', monospace;
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
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.add-tag-btn {
  padding: 0.25rem 0.5rem;
  border: 1px dashed #ccc;
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

  /* 响应式表格处理已在容器级别完成 */
  /* .files-table {
    display: block;
    overflow-x: auto;
  } */

  .tag-selection {
    justify-content: center;
  }
}
</style>