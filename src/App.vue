<template>
  <div class="app-container">
    <!-- 拖放覆盖层 -->
    <div v-if="isDragging" 
         class="drag-overlay"
         @dragover.prevent="handleDragOver"
         @drop.prevent="handleDrop">
      <div class="drag-content">
        <div class="drag-icon">📂</div>
        <div class="drag-text">{{ t('app.dragDrop.hint') }}</div>
      </div>
    </div>

    <!-- 标题栏 -->
    <header class="app-header">
      <h1>{{ t('app.title') }}</h1>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 侧边栏导航 -->
      <aside class="sidebar">
        <nav class="nav-menu">
          <div class="nav-item" :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <span class="nav-icon">📊</span>
            <span class="nav-label">{{ t('nav.dashboard') }}</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">
            <span class="nav-icon">📁</span>
            <span class="nav-label">{{ t('nav.files') }}</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'tags' }" @click="activeTab = 'tags'">
            <span class="nav-icon">🏷️</span>
            <span class="nav-label">{{ t('nav.tags') }}</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'directories' }" @click="activeTab = 'directories'">
            <span class="nav-icon">📂</span>
            <span class="nav-label">{{ t('nav.directories') }}</span>
          </div>
          <div class="nav-item" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">{{ t('nav.settings') }}</span>
          </div>
        </nav>
      </aside>

      <!-- 内容区域 -->
      <div class="content-area">
        <transition name="fade" mode="out-in">
          <Dashboard v-if="activeTab === 'dashboard'" class="tab-content" />
          <Files v-else-if="activeTab === 'files'" class="tab-content" />
          <Tags v-else-if="activeTab === 'tags'" class="tab-content" />
          <Directories v-else-if="activeTab === 'directories'" class="tab-content" />
          <Settings v-else-if="activeTab === 'settings'" class="tab-content" />
        </transition>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p>{{ t('app.footer') }}</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Dashboard from './components/Dashboard.vue';
import Files from './components/Files.vue';
import Tags from './components/Tags.vue';
import Directories from './components/Directories.vue';
import Settings from './components/Settings.vue';
import { useI18n } from './composables/useI18n';
import { useSettings } from './composables/useSettings';

const { t } = useI18n();
const { loadSettings } = useSettings();

// 活动标签页
const activeTab = ref('dashboard');

const switchTab = (tab) => {
  activeTab.value = tab;
};

// 监听切换标签的事件
window.addEventListener('switch-tab', (event) => {
  activeTab.value = event.detail.tab;
});

// 拖放逻辑
const isDragging = ref(false);
const dragCounter = ref(0);

const handleDragEnter = (e) => {
  e.preventDefault();
  // 检查是否包含文件
  const types = e.dataTransfer.types;
  if (types && (types.includes('Files') || Array.from(types).includes('Files'))) {
    dragCounter.value++;
    isDragging.value = true;
  }
};

const handleDragOver = (e) => {
  e.preventDefault();
  if (isDragging.value) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const handleDragLeave = (e) => {
  e.preventDefault();
  
  // 如果离开的是整个窗口（relatedTarget 为 null），直接重置
  if (!e.relatedTarget) {
    isDragging.value = false;
    dragCounter.value = 0;
    return;
  }

  if (isDragging.value) {
    dragCounter.value--;
    if (dragCounter.value <= 0) {
      isDragging.value = false;
      dragCounter.value = 0;
    }
  }
};

const handleDrop = async (e) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  dragCounter.value = 0;
  
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    // 获取所有文件路径
    const paths = Array.from(files).map(f => {
      // 优先尝试使用 electronAPI.getPathForFile 获取真实路径
      if (window.electronAPI && window.electronAPI.getPathForFile) {
        return window.electronAPI.getPathForFile(f);
      }
      // 降级使用 file.path (可能为空)
      return f.path;
    }).filter(p => p);
    
    if (paths.length > 0) {
      try {
        if (!window.electronAPI) {
          throw new Error('Electron API not found');
        }
        const result = await window.electronAPI.handleDroppedPaths(paths);
        if (result.success) {
          const { files, directories, errors } = result.results;
          let message = '';
          if (files > 0) message += t('common.alerts.filesAdded').replace('{count}', files) + '\n';
          if (directories > 0) message += `成功添加 ${directories} 个目录\n`;
          if (errors.length > 0) message += `发生 ${errors.length} 个错误:\n${errors.slice(0, 3).join('\n')}`;
          
          if (message) alert(message.trim());
          
          // 触发数据更新事件，通知其他组件刷新数据
          window.dispatchEvent(new CustomEvent('data-updated'));
          
          // 如果我们在 dashboard 或 directories 页面，刷新数据
          if (['dashboard', 'directories', 'files'].includes(activeTab.value)) {
             // 已通过事件通知刷新
          }
        } else {
          alert(`添加失败: ${result.error}`);
        }
      } catch (error) {
        console.error('处理拖放失败:', error);
        alert('操作失败: ' + error.message);
      }
    } else {
      console.warn('未检测到有效的文件路径');
      alert('无法获取文件路径，请确保拖入的是本地文件或文件夹。');
    }
  } else {
    console.warn('未检测到文件');
    if (e.dataTransfer.types.includes('Files')) {
       alert('拖放操作未包含有效文件数据。');
    }
  }
};

// 组件挂载时的初始化操作
onMounted(async () => {
  console.log('Tagged Finder 应用已启动');
  await loadSettings();
  
  // 绑定全局拖放事件
  window.addEventListener('dragenter', handleDragEnter);
  window.addEventListener('dragover', handleDragOver);
  window.addEventListener('dragleave', handleDragLeave);
  window.addEventListener('drop', handleDrop);
});

onUnmounted(() => {
  // 移除全局拖放事件
  window.removeEventListener('dragenter', handleDragEnter);
  window.removeEventListener('dragover', handleDragOver);
  window.removeEventListener('dragleave', handleDragLeave);
  window.removeEventListener('drop', handleDrop);
});
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 拖放覆盖层 */
.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(33, 150, 243, 0.8);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto; /* 允许拖放事件在覆盖层上触发 */
}

.drag-content {
  text-align: center;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  padding: 3rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 2px dashed rgba(255, 255, 255, 0.5);
}

.drag-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce 1s infinite;
}

.drag-text {
  font-size: 1.5rem;
  font-weight: 600;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* 标题栏 - 固定在顶部 */
.app-header {
  background-color: var(--text-main); /* Use main text color for header bg (dark blue/grey) or define a specific header-bg variable */
  color: var(--bg-card);
  padding: 1rem 2rem;
  box-shadow: var(--shadow-sm);
  z-index: 100;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  display: flex;
  align-items: center;
}

[data-theme="dark"] .app-header {
  background-color: var(--bg-card);
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

/* 主要内容区域 - 固定在顶部和底部之间 */
.main-content {
  display: flex;
  position: fixed;
  top: 70px; /* 与标题栏高度相同 */
  bottom: 45px; /* 与页脚高度相同 */
  left: 0;
  right: 0;
  overflow: hidden;
}

/* 侧边栏 - 固定在左侧 */
.sidebar {
  background-color: var(--bg-card);
  width: 240px;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  z-index: 50;
  position: fixed;
  left: 0;
  top: 70px;
  bottom: 45px;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
}

.nav-menu {
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: var(--text-main);
}

.nav-item:hover {
  background-color: var(--bg-main);
}

.nav-item.active {
  background-color: var(--primary-light);
  border-left: 4px solid var(--primary-color);
  color: var(--primary-dark);
}

[data-theme="dark"] .nav-item.active {
    color: var(--text-main); /* Ensure text is readable in dark mode active state */
}

.nav-icon {
  font-size: 1.2rem;
  margin-right: 1rem;
}

.nav-label {
  font-size: 1rem;
}

/* 内容区域 - 固定在侧边栏右侧，可滚动 */
.content-area {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: var(--bg-main);
  position: fixed;
  left: 240px;
  top: 70px;
  right: 0;
  bottom: 45px;
}

/* 页脚 - 固定在底部 */
.app-footer {
  background-color: var(--text-main);
  color: var(--bg-card);
  padding: 0.75rem 2rem;
  text-align: center;
  font-size: 0.875rem;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

[data-theme="dark"] .app-footer {
  background-color: var(--bg-card);
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  /* 响应式内容区域 */
  .content-area {
    left: 60px;
    padding: 1rem;
  }

  .nav-label {
    display: none;
  }

  .nav-item {
    padding: 1rem;
    justify-content: center;
  }

  .nav-icon {
    margin-right: 0;
  }
}
</style>
