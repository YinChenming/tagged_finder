<template>
  <div class="tags-container">
    <h2>标签管理</h2>
    
    <!-- 添加新标签 -->
    <div class="add-tag-container">
      <input 
        type="text" 
        v-model="newTagName" 
        placeholder="输入新标签名称..."
        class="tag-input"
      />
      <input 
        type="color" 
        v-model="newTagColor" 
        class="color-picker"
      />
      <button class="add-tag-btn" @click="addNewTag">添加标签</button>
    </div>
    
    <!-- 标签列表 -->
    <div class="tags-grid">
      <div 
        v-for="tag in tags" 
        :key="tag.id" 
        class="tag-card"
        :style="{ borderLeftColor: tag.color }"
      >
        <div class="tag-info">
          <h3 class="tag-name">{{ tag.name }}</h3>
          <div class="tag-meta">
            <span class="file-count">{{ getFilesCount(tag.id) }} 个文件</span>
            <span class="creation-date">{{ formatDate(tag.created_at) }}</span>
          </div>
        </div>
        <div class="tag-actions">
          <button class="view-btn" @click="viewFilesByTag(tag)">查看文件</button>
          <button class="edit-btn" @click="editTag(tag)">编辑</button>
          <button class="delete-btn" @click="confirmDelete(tag)">删除</button>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="tags.length === 0" class="empty-state">
        <div class="empty-icon">🏷️</div>
        <p>暂无标签，请创建第一个标签</p>
      </div>
    </div>
    
    <!-- 按标签筛选的文件列表 -->
    <div v-if="activeTag" class="tagged-files-container">
      <div class="tagged-files-header">
        <h3>标签为 "{{ activeTag.name }}" 的文件</h3>
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
          <p>此标签下暂无文件</p>
        </div>
      </div>
    </div>
    
    <!-- 编辑标签对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click.self="closeEditDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h3>编辑标签</h3>
          <button class="close-btn" @click="closeEditDialog">✕</button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label>标签名称</label>
            <input 
              type="text" 
              v-model="editingTag.name" 
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>标签颜色</label>
            <input 
              type="color" 
              v-model="editingTag.color" 
              class="color-picker-large"
            />
          </div>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="closeEditDialog">取消</button>
            <button class="primary-btn" @click="saveTagChanges">保存更改</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="cancelDelete">
      <div class="dialog">
        <div class="dialog-header">
          <h3>确认删除</h3>
        </div>
        <div class="dialog-content">
          <p>确定要删除标签 "{{ tagToDelete?.name }}" 吗？</p>
          <p class="warning-text">此操作将移除所有与此标签关联的文件标记。</p>
          <div class="dialog-footer">
            <button class="secondary-btn" @click="cancelDelete">取消</button>
            <button class="danger-btn" @click="deleteTag">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// 状态数据
const tags = ref([]);
const newTagName = ref('');
const newTagColor = ref('#4CAF50');
const showEditDialog = ref(false);
const editingTag = ref({});
const showDeleteConfirm = ref(false);
const tagToDelete = ref(null);
const activeTag = ref(null);
const taggedFiles = ref([]);

// 方法
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

const addNewTag = async () => {
  if (!newTagName.value.trim()) {
    alert('请输入标签名称');
    return;
  }
  
  try {
    const response = await window.electronAPI.createTag({
      name: newTagName.value.trim(),
      color: newTagColor.value
    });
    
    if (response.success) {
      tags.value.push(response.tag);
      newTagName.value = '';
      newTagColor.value = '#4CAF50';
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
    alert('请输入标签名称');
    return;
  }
  
  try {
    const response = await window.electronAPI.updateTag(editingTag.value);
    if (response.success) {
      const index = tags.value.findIndex(t => t.id === editingTag.value.id);
      if (index > -1) {
        tags.value[index] = response.tag;
      }
      closeEditDialog();
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

// 工具函数
const getFilesCount = (tagId) => {
  // 这里应该从数据库获取与标签关联的文件数量
  // 目前返回模拟数据
  const counts = [3, 5, 1, 7, 2, 9];
  return counts[tagId % counts.length];
};

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

/* 添加新标签 */
.add-tag-container {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
}

.tag-input {
  flex: 1;
  min-width: 250px;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.color-picker {
  width: 50px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
}

.add-tag-btn {
  padding: 0.75rem 1.5rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  white-space: nowrap;
}

.add-tag-btn:hover {
  background: #45a049;
}

/* 标签列表 */
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.tag-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tag-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tag-info {
  margin-bottom: 1rem;
}

.tag-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #2c3e50;
}

.tag-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
}

.tag-actions {
  display: flex;
  gap: 0.5rem;
}

.view-btn, .edit-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
}

.view-btn {
  background: #2196F3;
  color: white;
  flex: 1;
}

.view-btn:hover {
  background: #1976D2;
}

.edit-btn {
  background: #f5f5f5;
  color: #333;
}

.edit-btn:hover {
  background: #e0e0e0;
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