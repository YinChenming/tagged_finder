<template>
  <div class="tags-container">
    <h2>{{ t('tags.title') }}</h2>

    <!-- 标签搜索与添加 -->
    <div class="tag-controls">
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          :placeholder="t('tags.search.placeholder')"
          class="search-input"
        />
      </div>
      
      <div class="add-tag-container">
        <input
          type="text"
          v-model="newTagName"
          :placeholder="t('tags.add.placeholder')"
          class="tag-input"
          @keyup.enter="addNewTag"
        />
        <div class="color-picker-wrapper" @click.stop="showColorPalette = !showColorPalette">
          <div class="color-preview" :style="{ backgroundColor: newTagColor }"></div>
          <div v-if="showColorPalette" class="color-palette-dropdown" @click.stop>
            <div v-for="(palette, index) in presetPalettes" :key="index" class="palette-row">
              <div 
                v-for="color in palette" 
                :key="color" 
                class="color-swatch" 
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
                :class="{ active: newTagColor === color }"
              ></div>
            </div>
            
            <div class="custom-color-row">
              <button class="custom-color-btn" @click="triggerCustomPicker">
                {{ t('tags.add.customColor') }}
              </button>
              <input 
                type="color" 
                ref="customColorInput" 
                @input="handleCustomColor"
                @change="showColorPalette = false"
                style="visibility: hidden; position: absolute; width: 0; height: 0;"
              />
            </div>
          </div>
        </div>
        <button class="add-tag-btn" @click="addNewTag">{{ t('tags.add.button') }}</button>
      </div>
    </div>

    <!-- 标签列表 -->
    <div class="tags-grid">
      <div
        v-for="tag in filteredTags"
        :key="tag.id"
        class="tag-card"
        :style="{ borderLeftColor: tag.color }"
      >
        <div class="tag-info">
          <h3 class="tag-name">{{ tag.name }}</h3>
          <div class="tag-meta">
            <span class="file-count">{{ t('tags.list.fileCount').replace('{count}', getFilesCount(tag.id)) }}</span>
            <span class="creation-date">{{ formatDate(tag.created_at) }}</span>
          </div>
        </div>
        <div class="tag-actions">
          <button class="view-btn" @click="viewFilesByTag(tag)">{{ t('tags.actions.viewFiles') }}</button>
          <button class="edit-btn" @click="editTag(tag)">{{ t('tags.actions.edit') }}</button>
          <button class="delete-btn" @click="confirmDelete(tag)">{{ t('tags.actions.delete') }}</button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="tags.length === 0" class="empty-state">
        <div class="empty-icon">🏷️</div>
        <p>{{ t('tags.empty') }}</p>
      </div>
    </div>

    <!-- 按标签筛选的文件列表 -->
    <div v-if="activeTag" class="tagged-files-container">
      <div class="tagged-files-header">
        <h3>{{ t('tags.files.title').replace('{name}', activeTag.name) }}</h3>
        <button class="close-btn" @click="closeTaggedFiles">✕</button>
      </div>
      <div class="tagged-files-list">
        <div
          v-for="file in taggedFiles"
          :key="file.id"
          class="file-card"
          @click="openFile(file.path)"
        >
          <div class="file-icon">{{ getFileIcon(file.name) }}</div>
          <div class="file-info">
            <h4 class="file-name">{{ file.name }}</h4>
            <p class="file-path">{{ truncatePath(file.path, 60) }}</p>
            <div class="file-meta">
              <span>{{ formatSize(file.size) }}</span>
              <span>{{ formatDate(file.mtime) }}</span>
            </div>
          </div>
        </div>

        <div v-if="taggedFiles.length === 0" class="no-files">
          <p>{{ t('tags.files.empty') }}</p>
        </div>
      </div>
    </div>

    <!-- 编辑标签对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="closeEditDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ t('tags.edit.title') }}</h3>
          <button class="close-btn" @click="closeEditDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label>{{ t('tags.edit.name') }}</label>
            <input
              type="text"
              v-model="editingTag.name"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>{{ t('tags.edit.color') }}</label>
            <input
              type="color"
              v-model="editingTag.color"
              class="color-picker-large"
            />
          </div>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="closeEditDialog">{{ t('common.cancel') }}</button>
            <button class="primary-btn" @click="saveTagChanges">{{ t('tags.edit.save') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ t('tags.delete.title') }}</h3>
        </div>
        <div class="dialog-content">
          <p>{{ t('tags.delete.message').replace('{name}', tagToDelete?.name) }}</p>
          <p class="warning-text">{{ t('tags.delete.warning') }}</p>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="cancelDelete">{{ t('common.cancel') }}</button>
            <button class="danger-btn" @click="deleteTag">{{ t('tags.actions.delete') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '../composables/useI18n';

// 状态管理
const { t } = useI18n();
const tags = ref([]);
const searchQuery = ref('');
const newTagName = ref('');
const newTagColor = ref('#4CAF50');
const showColorPalette = ref(false);
const showEditDialog = ref(false);
const editingTag = ref({});
const showDeleteConfirm = ref(false);
const tagToDelete = ref(null);
const activeTag = ref(null);
const taggedFiles = ref([]);
const tagFileCounts = ref({}); // 存储标签文件数量的响应式数据
const customColorInput = ref(null);

// 预设色板生成
const generatePalette = (baseRgb, count) => {
  const [r, g, b] = baseRgb;
  const colors = [];
  const step = 0.6 / Math.floor(count / 2); // 调整亮度/饱和度步长
  
  // 生成比基准色浅的颜色
  for (let i = Math.floor(count / 2); i > 0; i--) {
    const factor = 1 + (i * step);
    const nr = Math.min(255, Math.round(r * factor + (255 - r) * (i * 0.1)));
    const ng = Math.min(255, Math.round(g * factor + (255 - g) * (i * 0.1)));
    const nb = Math.min(255, Math.round(b * factor + (255 - b) * (i * 0.1)));
    colors.push(`rgb(${nr}, ${ng}, ${nb})`);
  }
  
  // 基准色
  colors.push(`rgb(${r}, ${g}, ${b})`);
  
  // 生成比基准色深的颜色
  for (let i = 1; i <= Math.floor(count / 2); i++) {
    const factor = 1 - (i * step * 0.8);
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    colors.push(`rgb(${nr}, ${ng}, ${nb})`);
  }
  
  return colors;
};

const presetPalettes = [
  generatePalette([0, 0, 0], 5),       // Black
  generatePalette([0, 255, 255], 5),   // Cyan
  generatePalette([0, 255, 127], 5),   // SpringGreen
  generatePalette([255, 69, 0], 5),    // OrangeRed
  generatePalette([160, 32, 240], 5)   // Purple
];

const selectColor = (color) => {
  newTagColor.value = color;
  showColorPalette.value = false;
};

const triggerCustomPicker = () => {
  if (customColorInput.value) {
    customColorInput.value.click();
  }
};

const handleCustomColor = (event) => {
  newTagColor.value = event.target.value;
};

// 点击外部关闭色板
onMounted(() => {
  document.addEventListener('click', () => {
    showColorPalette.value = false;
  });
  loadTags();
});

// 计算属性
const filteredTags = computed(() => {
  if (!searchQuery.value) {
    return tags.value;
  }
  const query = searchQuery.value.toLowerCase();
  return tags.value.filter(tag => tag.name.toLowerCase().includes(query));
});

// 方法
const loadTags = async () => {
  try {
    const response = await window.electronAPI.getAllTags();
    if (response.success) {
      tags.value = response.tags;
      await updateTagFileCounts(); // 加载标签后更新文件数量
    }
  } catch (error) {
    console.error('加载标签失败:', error);
  }
};

// 更新所有标签的文件数量
const updateTagFileCounts = async () => {
  try {
    const counts = {};
    for (const tag of tags.value) {
      const response = await window.electronAPI.getFilesCount(tag.id);
      counts[tag.id] = response.success ? response.count : 0;
    }
    tagFileCounts.value = counts;
  } catch (error) {
    console.error('更新标签文件数量失败:', error);
  }
};

// 获取标签的文件数量
const getFilesCount = (tagId) => {
  return tagFileCounts.value[tagId] || 0;
};

const addNewTag = async () => {
  if (!newTagName.value.trim()) {
    alert(t('common.alerts.tagRequired'));
    return;
  }

  try {
    const response = await window.electronAPI.addTag({
      name: newTagName.value.trim(),
      color: newTagColor.value
    });

    if (response.success) {
      tags.value.push(response.tag);
      newTagName.value = '';
      newTagColor.value = '#4CAF50';
      await updateTagFileCounts(); // 添加标签后更新文件数量
    }
  } catch (error) {
    console.error('添加标签失败:', error);
  }
};

const editTag = (tag) => {
  editingTag.value = { ...tag };
  showEditDialog.value = true;
};

const closeEditDialog = () => {
  showEditDialog.value = false;
  editingTag.value = {};
};

const saveTagChanges = async () => {
  if (!editingTag.value.name.trim()) {
    alert(t('common.alerts.tagRequired'));
    return;
  }

  try {
    // 只传递必要的字段，避免传递整个Vue响应式对象
    const tagUpdateData = {
      id: editingTag.value.id,
      name: editingTag.value.name.trim(),
      color: editingTag.value.color
    };

    const response = await window.electronAPI.updateTag(tagUpdateData);
    if (response.success) {
      const index = tags.value.findIndex(t => t.id === editingTag.value.id);
      if (index > -1) {
        tags.value[index] = response.tag;
      }
      closeEditDialog();
      // 更新标签名称或颜色不影响文件数量，不需要调用updateTagFileCounts
    }
  } catch (error) {
    console.error('更新标签失败:', error);
  }
};

const confirmDelete = (tag) => {
  tagToDelete.value = tag;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  tagToDelete.value = null;
};

const deleteTag = async () => {
  try {
    const response = await window.electronAPI.deleteTag(tagToDelete.value.id);
    if (response.success) {
      tags.value = tags.value.filter(t => t.id !== tagToDelete.value.id);
      cancelDelete();
      await updateTagFileCounts(); // 删除标签后更新文件数量
    }
  } catch (error) {
    console.error('删除标签失败:', error);
  }
};

const viewFilesByTag = async (tag) => {
  activeTag.value = tag;
  try {
    const response = await window.electronAPI.getFilesByTag(tag.id);
    if (response.success) {
      taggedFiles.value = response.files;
    }
  } catch (error) {
    console.error('获取标签文件失败:', error);
  }
};

const closeTaggedFiles = () => {
  activeTag.value = null;
  taggedFiles.value = [];
};

const openFile = async (filePath) => {
  try {
    await window.electronAPI.openFile(filePath);
  } catch (error) {
    console.error('打开文件失败:', error);
  }
};

// 工具函数已移至前面

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
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

const truncatePath = (path, maxLength) => {
  if (path.length <= maxLength) return path;
  return '...' + path.slice(-(maxLength - 3));
};

// 组件挂载时加载标签
onMounted(() => {
  loadTags();
});
</script>

<style scoped>
.tags-container {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 2rem;
  color: #2c3e50;
}

/* 标签搜索与添加 */
.tag-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: center;
  justify-content: space-between;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background-color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 206, 209, 0.15);
}

.add-tag-container {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  background: #fff;
  padding: 0.5rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #e1e8ed;
}

.tag-input {
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.9rem;
}

.tag-input:focus {
  border-color: var(--primary-color);
}

.color-picker-wrapper {
  position: relative;
}

.color-preview {
  width: 40px;
  height: 36px;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.color-palette-dropdown {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.8rem;
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 100;
  width: 260px;
  animation: paletteFadeIn 0.2s ease-out;
}

@keyframes paletteFadeIn {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.palette-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.palette-row:last-child {
  margin-bottom: 0;
}

.custom-color-row {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;
}

.custom-color-btn {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.custom-color-btn:hover {
  background: var(--primary-light);
  box-shadow: 0 2px 4px rgba(0, 206, 209, 0.15);
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.color-swatch.active {
  border-color: #333;
  transform: scale(1.1);
}

.add-tag-btn {
  padding: 0.5rem 1.2rem;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 206, 209, 0.2);
  transition: all 0.3s ease;
}

.add-tag-btn:hover {
  background: linear-gradient(135deg, var(--primary-hover), var(--primary-color));
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 206, 209, 0.3);
}

/* 标签列表 */
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.tag-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border-left: 5px solid;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.tag-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.tag-info {
  margin-bottom: 1.2rem;
}

.tag-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-main);
  font-weight: 600;
  letter-spacing: -0.5px;
}

.tag-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
}

.tag-actions {
  display: flex;
  gap: 0.75rem;
}

.view-btn, .edit-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.view-btn {
  background: var(--primary-light);
  color: var(--primary-dark);
  flex: 1;
  border: 1px solid transparent;
}

.view-btn:hover {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 2px 6px rgba(0, 206, 209, 0.25);
}

.edit-btn {
  background: #f0f2f5;
  color: var(--text-secondary);
}

.edit-btn:hover {
  background: #e1e8ed;
  color: var(--text-main);
}

.delete-btn {
  background: #fff0f0;
  color: #ff5252;
}

.delete-btn:hover {
  background: #ff5252;
  color: white;
  box-shadow: 0 2px 6px rgba(255, 82, 82, 0.25);
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* 标签文件列表 */
.tagged-files-container {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tagged-files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tagged-files-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background-color: #f0f0f0;
}

.tagged-files-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.file-card:hover {
  background-color: #f9f9f9;
}

.file-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.file-info {
  flex: 1;
}

.file-name {
  margin: 0 0 0.25rem 0;
  font-weight: 500;
  color: #2c3e50;
}

.file-path {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.file-meta {
  display: flex;
  gap: 1rem;
  color: #999;
  font-size: 0.85rem;
}

.no-files {
  text-align: center;
  padding: 2rem;
  color: #999;
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

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.color-picker-large {
  width: 100%;
  height: 50px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
}

.dialog-content {
  padding: 1.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
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

.warning-text {
  color: #ff9800;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .add-tag-container {
    flex-direction: column;
  }

  .tag-input {
    width: 100%;
  }

  .tags-grid {
    grid-template-columns: 1fr;
  }

  .file-card {
    flex-direction: column;
    text-align: center;
  }

  .file-icon {
    margin-right: 0;
    margin-bottom: 1rem;
  }
}
</style>